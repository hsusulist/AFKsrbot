import ServerInfo from '../ServerInfo';

export default function ServerInfoExample() {
  return (
    <ServerInfo 
      host="play.example.com"
      port={25565}
      isConnected={true}
      playerCount={24}
      maxPlayers={50}
      ping={37}
      version="1.21.1"
    />
  );
}