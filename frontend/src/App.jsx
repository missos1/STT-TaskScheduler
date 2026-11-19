import { useState } from 'react'
import HomeScreen from './components/join/HomeScreen'
import PreJoinScreen from './components/join/PreJoinScreen'

export default function App() {
  const [screen, setScreen] = useState('home')

  if (screen === 'prejoin') {
    return (
      <PreJoinScreen
        onBack={() => setScreen('home')}
        onEnter={(info) => console.log('Vao hop:', info)}
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