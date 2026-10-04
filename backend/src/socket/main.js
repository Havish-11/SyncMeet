import { verifyToken } from "../middleware/auth.js";
import {
  getRoom,
  addParticipant,
  removeParticipant,
  listPeers,
  toPublic,
} from "../rooms/store.js";

export function registerSocket(io) {
  io.use((socket, next) => {
    try {
      socket.user = verifyToken(socket.handshake.auth?.token);
      next();
    } catch {
      next(new Error("unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const me = socket.user;

    const leave = (reason) => {
      // leaving the meet
      const roomId = socket.roomId;

      if (!roomId) return;
      socket.roomId = null;
      socket.leave(roomId);

      const room = getRoom(roomId);
      const q = room?.participants.get(me.id);
      if (!q || q.socketId !== socket.id) return;
      const { newHostId } = removeParticipant(room, me.id);
      io.to(roomId).emit("user-left", { userId: me.id, reason });
      if (newHostId) io.to(roomId).emit("host-changed", { hostId: newHostId });
    };

    socket.on("join-room", ({ roomId, mic = true, cam = true } = {}, ack) => {
      const room = getRoom(roomId);
      if (!room) return ack?.({ error: "Room not found" });
      if (socket.roomId) leave("switched");

      // Same user already in room (refresh / second tab): evict the old socket
      const existing = room.participants.get(me.id);
      if (existing) {
        const old = io.sockets.sockets.get(existing.socketId);
        if (old) {
          old.roomId = null;
          old.leave(roomId);
          old.emit("replaced");
        }
        io.to(roomId).emit("user-left", { userId: me.id, reason: "rejoined" });
      }

      const peers = listPeers(room, me.id);
      const self = addParticipant(room, {
        userId: me.id,
        name: me.name,
        socketId: socket.id,
        mic,
        cam,
      });
      socket.join(roomId);
      socket.roomId = roomId;
      socket.to(roomId).emit("user-joined", toPublic(self));
      ack?.({ ok: true, hostId: room.hostId, peers });
    });

    for (const event of ["offer", "answer", "ice-candidate"]) {
      socket.on(event, ({ to, data } = {}) => {
        const room = getRoom(socket.roomId);
        const target = room?.participants.get(to);
        if (!target) return;
        io.to(target.socketId).emit(event, { from: me.id, data });
      });
    }

    socket.on("media-state", ({ mic, cam, sharing } = {}) => {
      const room = getRoom(socket.roomId);
      const q = room?.participants.get(me.id);
      if (!q) return;
      if (typeof mic === "boolean") q.mic = mic;
      if (typeof cam === "boolean") q.cam = cam;
      if (typeof sharing === "boolean") q.sharing = sharing;
      socket
        .to(socket.roomId)
        .emit("media-state", {
          userId: me.id,
          mic: q.mic,
          cam: q.cam,
          sharing: q.sharing,
        });
    });

    socket.on("chat-message", ({ text } = {}) => {
      const clean = typeof text === "string" ? text.trim().slice(0, 2000) : "";
      if (!clean || !getRoom(socket.roomId)?.participants.has(me.id)) return;
      io.to(socket.roomId).emit("chat-message", {
        userId: me.id,
        name: me.name,
        text: clean,
        timestamp: Date.now(),
      });
    });

    socket.on("kick", ({ userId } = {}) => {
      const room = getRoom(socket.roomId);
      if (!room || room.hostId !== me.id || userId === me.id) return;
      const target = room.participants.get(userId);
      if (!target) return;
      io.to(target.socketId).emit("kicked");
      const t = io.sockets.sockets.get(target.socketId);
      if (t) {
        t.roomId = null;
        t.leave(room.id);
      }
      removeParticipant(room, userId);
      io.to(room.id).emit("user-left", { userId, reason: "kicked" });
    });

    socket.on('leave-room', () => leave('left'));
    socket.on('disconnect', () => leave('disconnected'));
  });
}
