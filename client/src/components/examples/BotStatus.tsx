import BotStatus from '../BotStatus';

export default function BotStatusExample() {
  return (
    <BotStatus 
      isOnline={true}
      health={95}
      food={78}
      position={{ x: 1234, y: 64, z: -567 }}
      uptime="2h 14m"
      playersNearby={3}
    />
  );
}