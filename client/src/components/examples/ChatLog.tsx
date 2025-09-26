import ChatLog from '../ChatLog';

export default function ChatLogExample() {
  // todo: remove mock functionality
  const mockMessages = [
    {
      id: '1',
      timestamp: '14:32:15',
      player: 'Steve123',
      message: 'Hey everyone!',
      type: 'chat' as const
    },
    {
      id: '2', 
      timestamp: '14:32:18',
      player: 'AFKsrbot',
      message: 'Hi Steve123! Do you love the server?',
      type: 'bot' as const
    },
    {
      id: '3',
      timestamp: '14:32:22',
      player: 'Steve123', 
      message: 'Yes I do!',
      type: 'chat' as const
    },
    {
      id: '4',
      timestamp: '14:32:25',
      player: 'AFKsrbot',
      message: 'Me too I loved the server very much',
      type: 'bot' as const
    },
    {
      id: '5',
      timestamp: '14:33:10',
      player: 'Server',
      message: 'Player Miner456 joined the game',
      type: 'join' as const
    },
    {
      id: '6',
      timestamp: '14:33:45',
      player: 'Miner456',
      message: 'This server is terrible',
      type: 'chat' as const
    },
    {
      id: '7',
      timestamp: '14:33:48',
      player: 'AFKsrbot', 
      message: 'You don\'t belong to this server Get out Miner456',
      type: 'bot' as const
    }
  ];

  return <ChatLog messages={mockMessages} />;
}