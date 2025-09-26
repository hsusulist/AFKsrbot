import PlayerList from '../PlayerList';

export default function PlayerListExample() {
  // todo: remove mock functionality
  const mockPlayers = [
    {
      id: '1',
      username: 'Steve123',
      ping: 45,
      isOperator: false,
      distance: 234,
      lastSeen: '2 min ago'
    },
    {
      id: '2', 
      username: 'AdminUser',
      ping: 23,
      isOperator: true,
      distance: 1250,
      lastSeen: '5 min ago'
    },
    {
      id: '3',
      username: 'Miner456',
      ping: 78,
      isOperator: false,
      distance: 89,
      lastSeen: '1 min ago'
    },
    {
      id: '4',
      username: 'Builder99',
      ping: 156,
      isOperator: false,
      distance: 2340,
      lastSeen: '8 min ago'
    }
  ];

  return <PlayerList players={mockPlayers} totalOnline={24} />;
}