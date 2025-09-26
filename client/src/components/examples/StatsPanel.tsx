import StatsPanel from '../StatsPanel';

export default function StatsPanelExample() {
  // todo: remove mock functionality
  const mockStats = {
    messagesReceived: 2847,
    greetingsSent: 189,
    distanceWalked: 15234,
    playersGreeted: 47,
    uptimePercentage: 97,
    interactionsToday: 23
  };

  return <StatsPanel stats={mockStats} />;
}