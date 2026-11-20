import { useState } from 'react'
import HomeScreen from './components/join/HomeScreen'
import PreJoinScreen from './components/join/PreJoinScreen'
import WaitingRoom from './components/join/WaitingRoom'
import CreateMeeting from './components/host/CreateMeeting'
import HostWaitingRoom from './components/host/HostWaitingRoom'
import RecordingScreen from './components/transcript/RecordingScreen'
import MeetingResultPanel from './components/summary/MeetingResultPanel'

export default function App() {
  const [screen, setScreen] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('demo') === 'summary' ? 'summary' : 'home'
  })
  const [isHost, setIsHost] = useState(false)

  switch (screen) {
    case 'prejoin':
      return <PreJoinScreen onBack={() => setScreen('home')} onEnter={() => { setIsHost(false); setScreen('waiting') }} />
    case 'waiting':
      return <WaitingRoom onLeave={() => setScreen('home')} onDemoStart={() => setScreen('recording')} />
    case 'create':
      return <CreateMeeting onBack={() => setScreen('home')} onOpenRoom={() => { setIsHost(true); setScreen('hostwait') }} />
    case 'hostwait':
      return <HostWaitingRoom onStart={() => setScreen('recording')} onWait={() => {}} />
    case 'recording':
      return (
        <RecordingScreen
          isHost={isHost}
          onStop={() => setScreen('summary')}
          onLeave={() => setScreen('home')}
        />
      )
    case 'summary':
      return <MeetingResultPanel meetCode="abc-defg-hij" />
    default:
      return <HomeScreen onJoin={() => setScreen('prejoin')} onCreate={() => setScreen('create')} />
  }
}