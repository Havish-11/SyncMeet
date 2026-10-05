import { getUserFromToken } from '../middleware/auth.js';
import {
  getRoom,
  addParticipant,
  removeParticipant,
  getOtherParticipants,
  publicParticipant,
} from '../rooms/store.js';

export function registerSocket(io) {
  // Check the JWT before allowing a socket connection.
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      socket.user = getUserFromToken(token);
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.user;

    function leaveRoom(reason) {
      const roomId = socket.roomId;
      if (!roomId) return;

      const room = getRoom(roomId);
      socket.roomId = null;
      socket.leave(roomId);

      if (!room) return;

      const participant = room.participants.get(user.id);

      // Ignore an old socket that was already replaced.
      if (!participant || participant.socketId !== socket.id) return;

      const newHostId = removeParticipant(room, user.id);

      io.to(roomId).emit('user-left', {
        userId: user.id,
        reason,
      });

      if (newHostId) {
        io.to(roomId).emit('host-changed', { hostId: newHostId });
      }
    }

    socket.on('join-room', ({ roomId, mic = true, cam = true } = {}, reply) => {
      const room = getRoom(roomId);

      if (!room) {
        reply?.({ error: 'Room not found' });
        return;
      }

      if (socket.roomId) {
        leaveRoom('switched');
      }

      // If this user is already connected, close the old connection.
      const oldParticipant = room.participants.get(user.id);

      if (oldParticipant) {
        const oldSocket = io.sockets.sockets.get(oldParticipant.socketId);

        if (oldSocket) {
          oldSocket.roomId = null;
          oldSocket.leave(roomId);
          oldSocket.emit('replaced');
        }

        room.participants.delete(user.id);
        io.to(roomId).emit('user-left', {
          userId: user.id,
          reason: 'rejoined',
        });
      }

      // Get the people already in the room.
      const oldParticipants = getOtherParticipants(room, user.id);

      const participant = addParticipant(room, {
        userId: user.id,
        name: user.name,
        socketId: socket.id,
        mic,
        cam,
      });

      socket.join(roomId);
      socket.roomId = roomId;

      // Tell existing users that a new user joined.
      socket.to(roomId).emit('user-joined', publicParticipant(participant));

      reply?.({
        ok: true,
        hostId: room.hostId,
        peers: oldParticipants,
      });
    });

    // WebRTC messages are simply forwarded to the correct user.
    socket.on('offer', ({ to, data }) => sendToUser('offer', to, data));
    socket.on('answer', ({ to, data }) => sendToUser('answer', to, data));
    socket.on('ice-candidate', ({ to, data }) => sendToUser('ice-candidate', to, data));

    function sendToUser(eventName, userId, data) {
      const room = getRoom(socket.roomId);
      const target = room?.participants.get(userId);

      if (!target) return;

      io.to(target.socketId).emit(eventName, {
        from: user.id,
        data,
      });
    }

    socket.on('media-state', (changes = {}) => {
      const room = getRoom(socket.roomId);
      const participant = room?.participants.get(user.id);

      if (!participant) return;

      if (typeof changes.mic === 'boolean') participant.mic = changes.mic;
      if (typeof changes.cam === 'boolean') participant.cam = changes.cam;
      if (typeof changes.sharing === 'boolean') participant.sharing = changes.sharing;

      socket.to(socket.roomId).emit('media-state', {
        userId: user.id,
        mic: participant.mic,
        cam: participant.cam,
        sharing: participant.sharing,
      });
    });

    socket.on('chat-message', ({ text } = {}) => {
      const room = getRoom(socket.roomId);
      if (!room?.participants.has(user.id)) return;

      const cleanText = typeof text === 'string' ? text.trim().slice(0, 2000) : '';
      if (!cleanText) return;

      io.to(socket.roomId).emit('chat-message', {
        userId: user.id,
        name: user.name,
        text: cleanText,
        timestamp: Date.now(),
      });
    });

    socket.on('kick', ({ userId } = {}) => {
      const room = getRoom(socket.roomId);

      if (!room || room.hostId !== user.id || userId === user.id) return;

      const target = room.participants.get(userId);
      if (!target) return;

      io.to(target.socketId).emit('kicked');

      const targetSocket = io.sockets.sockets.get(target.socketId);
      if (targetSocket) {
        targetSocket.roomId = null;
        targetSocket.leave(room.id);
      }

      removeParticipant(room, userId);
      io.to(room.id).emit('user-left', {
        userId,
        reason: 'kicked',
      });
    });

    socket.on('leave-room', () => leaveRoom('left'));
    socket.on('disconnect', () => leaveRoom('disconnected'));
  });
}
