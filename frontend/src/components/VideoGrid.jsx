import VideoTile from './VideoTile.jsx';
import { getGridColumns } from '../lib/rtc.js';

export default function VideoGrid({ tiles }) {
  const sortedTiles = [...tiles].sort(
    (a, b) => Number(b.sharing) - Number(a.sharing)
  );

  return (
    <div
      className="grid"
      style={{
        gridTemplateColumns: `repeat(${getGridColumns(sortedTiles.length)}, 1fr)`,
      }}
    >
      {sortedTiles.map((tile) => (
        <VideoTile key={tile.id} {...tile} />
      ))}
    </div>
  );
}
