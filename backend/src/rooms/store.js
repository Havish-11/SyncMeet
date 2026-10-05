import { randomUUID } from 'crypto';

// Rooms only live in memory. MongoDB is used for USER accounts.
const ROOMS = new Map();
const EMPTY_ROOM_TIME = 5 * 60 * 1000;

export function createRoom(hostId) {
  const room = {
    id: randomUUID().slice(0, 8),
    hostId,
    participants: new Map(),
    emptySince: Date.now(),
  };

  ROOMS.set(room.id, room);
  return room;
}

export function getRoom(roomId) {
  return ROOMS.get(roomId);
}

export function addParticipant(room, USER) {
  const participant = {
    userId: USER.userId,
    name: USER.name,
    socketId: USER.socketId,
    mic: USER.mic,
    cam: USER.cam,
    sharing: false,
  };

  room.participants.set(USER.userId, participant);
  room.emptySince = null;
  return participant;
}

export function removeParticipant(room, userId) {
  room.participants.delete(userId);

  let newHostId = null;

  if (room.participants.size === 0) {
    room.emptySince = Date.now();
  } else if (room.hostId === userId) {
    // Give host to the first remaining participant.
    newHostId = room.participants.keys().next().value;
    room.hostId = newHostId;
  }

  return newHostId;
}

export function publicParticipant(participant) {
  return {
    userId: participant.userId,
    name: participant.name,
    mic: participant.mic,
    cam: participant.cam,
    sharing: participant.sharing,
  };
}

export function getOtherParticipants(room, myUserId) {
  const result = [];

  for (const participant of room.participants.values()) {
    if (participant.userId !== myUserId) {
      result.push(publicParticipant(participant));
    }
  }

  return result;
}

// Delete ROOMS that have been empty for too long.
export function startRoomCleanup() {
  setInterval(() => {
    const now = Date.now();

    for (const [roomId, room] of ROOMS) {
      if (
        room.participants.size === 0 &&
        now - room.emptySince > EMPTY_ROOM_TIME
      ) {
        ROOMS.delete(roomId);
      }
    }
  }, 30_000).unref();
}
