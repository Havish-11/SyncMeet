import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { createRoom, getRoom } from '../rooms/store.js';

const router = Router();
router.use(requireAuth);

router.post('/', (req, res) => {
  const room = createRoom(req.user.id);
  res.status(201).json({ roomId: room.id });
});

router.get('/:roomId', (req, res) => {
  const room = getRoom(req.params.roomId);

  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  res.json({
    roomId: room.id,
    isHost: room.hostId === req.user.id,
    participantCount: room.participants.size,
  });
});

export default router;
