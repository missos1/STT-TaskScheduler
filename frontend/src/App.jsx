import { useState } from 'react'
import HomeScreen from './components/join/HomeScreen'
import PreJoinScreen from './components/join/PreJoinScreen'
import WaitingRoom from './components/join/WaitingRoom'

export default function App() {
  const [screen, setScreen] = useState('home')

  if (screen === 'prejoin') {
    return (
      <PreJoinScreen
        onBack={() => setScreen('home')}
        onEnter={() => setScreen('waiting')}
      />
    )
  }

  if (screen === 'waiting') {
    return (
      <WaitingRoom
        onLeave={() => setScreen('home')}
        onDemoStart={() => console.log('Chuyen sang man dang hop (cua Trung)')}
      />
    )
  }

  return (
    <HomeScreen
      onJoin={() => setScreen('prejoin')}
      onCreate={() => console.log('Tao cuoc hop moi')}
    />
  )
}