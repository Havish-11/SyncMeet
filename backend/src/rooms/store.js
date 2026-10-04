import {randomUUID} from 'crypto';

const rooms = new Map(); // main storage of all rooms. roomId -> { id, hostId, participants: Map<userId, p>, emptySince }
const EMPTY_TTL_MS = 4*60*1000; // empty room timeout

export function createRoom(hostId) { //hostId is the userId of the person who is the host of this room
    const id = randomUUID().slice(0,8);

    rooms.set(id,{
        id,
        hostId,
        participants: new Map(), emptySince: Date.now()
    });

    return rooms.get(id);
}

export const getRoom = (id) => rooms.get(id); // searches for a room

export function addParticipant(room, {
    userId,
    name,
    socketId,
    mic,
    cam
}){ // add a new participant
    const p = { userId, name, socketId, mic, cam, sharing: false};
    room.participants.set(userId,p);
    room.emptySince=null;
    return p;
}

export function removeParticipant(room,userId) {
    room.participants.delete(userId);
    let newHostId = null;

    if(room.participants.size===0) {
        room.emptySince = Date.now();
    }else if (room.hostId===userId) {
        newHostId = room.participants.keys().next().value; // longest present participant
        room.hostId= newHostId;
    }

    return { newHostId };
}


export const toPublic = ({ userId, name, mic, cam, sharing }) => ({ userId, name, mic, cam, sharing });

export const listPeers = (room, exceptUserId) =>
  [...room.participants.values()].filter((p) => p.userId !== exceptUserId).map(toPublic);

export function startSweeper() { // automatically deletes old rooms
  setInterval(() => {
    const now = Date.now();
    for (const [id, r] of rooms)
      if (r.participants.size === 0 && now - r.emptySince > EMPTY_TTL_MS) rooms.delete(id);
  }, 30_000).unref(); //unref to shut it down
}