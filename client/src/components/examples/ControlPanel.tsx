import ControlPanel from '../ControlPanel';

export default function ControlPanelExample() {
  return (
    <ControlPanel 
      isConnected={true}
      isRunning={true}
      onStart={() => console.log('Start bot')}
      onStop={() => console.log('Stop bot')}
      onRestart={() => console.log('Restart bot')}
      onSettings={() => console.log('Open settings')}
    />
  );
}