import HomeScreen from './components/join/HomeScreen'

export default function App() {
  return (
    <HomeScreen
      onJoin={(code) => console.log('Vao hop:', code)}
      onCreate={() => console.log('Tao cuoc hop moi')}
    />
  )
}