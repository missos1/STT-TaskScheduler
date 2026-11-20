import { useState } from 'react'
import HomeScreen from './components/join/HomeScreen'
import PreJoinScreen from './components/join/PreJoinScreen'
import WaitingRoom from './components/join/WaitingRoom'
import CreateMeeting from './components/host/CreateMeeting'
import HostWaitingRoom from './components/host/HostWaitingRoom'
import MeetingResultPanel from './components/summary/MeetingResultPanel'

export default function App() {
  const [screen, setScreen] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('demo') === 'summary' ? 'summary' : 'home'
  })

  switch (screen) {
    case 'prejoin':
      return <PreJoinScreen onBack={() => setScreen('home')} onEnter={() => setScreen('waiting')} />
    case 'waiting':
      return (
        <WaitingRoom
          onLeave={() => setScreen('home')}
          onDemoStart={() => console.log('Chuyen sang man dang hop (cua Trung)')}
        />
      )
    case 'create':
      return <CreateMeeting onBack={() => setScreen('home')} onOpenRoom={() => setScreen('hostwait')} />
    case 'hostwait':
      return (
        <HostWaitingRoom
          onStart={() => console.log('Bat dau ghi (chuyen sang man dang hop)')}
          onWait={() => {}}
        />
      )

      case 'summary':
        return (
          <div className="mx-auto h-screen w-[400px] border-x border-line">
            <MeetingResultPanel meetCode="abc-defg-hij" />
          </div>
        )
        
    default:
      return <HomeScreen onJoin={() => setScreen('prejoin')} onCreate={() => setScreen('create')} />
  }
}