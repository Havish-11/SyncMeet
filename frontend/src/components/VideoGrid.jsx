import VideoTile from './VideoTile.jsx';
import { gridColumns } from '../lib/rtc.js';

// tiles: [{ id, name, stream, local, mic, cam, sharing, host }]
export default function VideoGrid({ tiles }) {
  const ordered = [...tiles].sort((a, b) => Number(b.sharing) - Number(a.sharing)); // screensharers first
  return (
    <div className="grid" style={{ gridTemplateColumns: `repeat(${gridColumns(ordered.length)}, 1fr)` }}>
      {ordered.map(({ id, ...t }) => <VideoTile key={id} {...t} />)}
    </div>
  );
}