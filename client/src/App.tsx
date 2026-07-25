import { Routes, Route } from 'react-router-dom'
import Layout from '@/components/layout/Layout'
import Home from '@/routes/Home'
import Seasons from '@/routes/Seasons'
import SeasonDetail from '@/routes/SeasonDetail'
import RaceDetail from '@/routes/RaceDetail'
import StandingsDrivers from '@/routes/StandingsDrivers'
import StandingsConstructors from '@/routes/StandingsConstructors'
import Drivers from '@/routes/Drivers'
import DriverDetail from '@/routes/DriverDetail'
import Teams from '@/routes/Teams'
import TeamDetail from '@/routes/TeamDetail'
import Circuits from '@/routes/Circuits'
import CircuitDetail from '@/routes/CircuitDetail'
import Search from '@/routes/Search'
import NotFound from '@/routes/NotFound'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="seasons" element={<Seasons />} />
        <Route path="seasons/:year" element={<SeasonDetail />} />
        <Route path="races/:year/:round" element={<RaceDetail />} />
        <Route path="standings/drivers" element={<StandingsDrivers />} />
        <Route path="standings/drivers/:year" element={<StandingsDrivers />} />
        <Route path="standings/constructors" element={<StandingsConstructors />} />
        <Route path="standings/constructors/:year" element={<StandingsConstructors />} />
        <Route path="drivers" element={<Drivers />} />
        <Route path="drivers/:driverId" element={<DriverDetail />} />
        <Route path="teams" element={<Teams />} />
        <Route path="teams/:teamId" element={<TeamDetail />} />
        <Route path="circuits" element={<Circuits />} />
        <Route path="circuits/:circuitId" element={<CircuitDetail />} />
        <Route path="search" element={<Search />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
