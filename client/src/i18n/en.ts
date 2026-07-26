export interface Dictionary {
  brand: { name: string; tagline: string }
  nav: {
    home: string
    seasons: string
    standings: string
    drivers: string
    teams: string
    circuits: string
    search: string
  }
  home: {
    nextRace: string
    lastRace: string
    driversStandings: string
    constructorsStandings: string
    viewFull: string
    countdown: string
    days: string
    hours: string
    minutes: string
    seconds: string
  }
  session: {
    fp1: string
    fp2: string
    fp3: string
    qualy: string
    sprintQualy: string
    sprintRace: string
    race: string
    notHeldYet: string
  }
  table: {
    position: string
    driver: string
    team: string
    points: string
    wins: string
    gap: string
    grid: string
    time: string
    laps: string
    fastestLap: string
    q1: string
    q2: string
    q3: string
    retired: string
    season: string
  }
  driver: {
    nationality: string
    born: string
    number: string
    currentTeam: string
    resultsBySeason: string
    seasonResults: string
    noNumber: string
  }
  driversPage: {
    sortBy: string
    alphabetical: string
    championships: string
    wins: string
    firstYear: string
    lastYear: string
    countryFilter: string
    teamFilter: string
    allCountries: string
    allTeams: string
    loadLastTeam: string
    loadingArchive: string
    loadingCareerStats: string
    resultCount: string
    someSeasonsFailed: string
    retry: string
  }
  team: {
    country: string
    firstAppearance: string
    constructorsChampionships: string
    driversChampionships: string
    resultsBySeason: string
    racesEntered: string
  }
  circuit: {
    country: string
    city: string
    length: string
    corners: string
    lapRecord: string
    firstParticipation: string
    fastestLapBy: string
    realTrace: string
    abstractTrace: string
  }
  season: {
    calendar: string
    round: string
    winner: string
    races: string
    jumpToSeason: string
  }
  search: {
    placeholder: string
    drivers: string
    teams: string
    circuits: string
    noResults: string
    prompt: string
  }
  status: {
    loading: string
    error: string
    retry: string
    empty: string
    futureRound: string
    slowNotice: string
  }
  pagination: { previous: string; next: string; page: string }
  notFound: { title: string; body: string; cta: string }
  language: { label: string; pt: string; en: string }
}

const en: Dictionary = {
  brand: {
    name: 'F1STATS',
    tagline: 'Every driver. Every team. Every lap.',
  },
  nav: {
    home: 'Home',
    seasons: 'Seasons',
    standings: 'Standings',
    drivers: 'Drivers',
    teams: 'Teams',
    circuits: 'Circuits',
    search: 'Search',
  },
  home: {
    nextRace: 'Next race',
    lastRace: 'Last race',
    driversStandings: "Drivers' championship",
    constructorsStandings: "Constructors' championship",
    viewFull: 'View full standings',
    countdown: 'Lights out in',
    days: 'd',
    hours: 'h',
    minutes: 'm',
    seconds: 's',
  },
  session: {
    fp1: 'Practice 1',
    fp2: 'Practice 2',
    fp3: 'Practice 3',
    qualy: 'Qualifying',
    sprintQualy: 'Sprint qualifying',
    sprintRace: 'Sprint',
    race: 'Race',
    notHeldYet: 'This session has not taken place yet.',
  },
  table: {
    position: 'Pos',
    driver: 'Driver',
    team: 'Team',
    points: 'Pts',
    wins: 'Wins',
    gap: 'Gap',
    grid: 'Grid',
    time: 'Time',
    laps: 'Laps',
    fastestLap: 'Fastest lap',
    q1: 'Q1',
    q2: 'Q2',
    q3: 'Q3',
    retired: 'Retired',
    season: 'Season',
  },
  driver: {
    nationality: 'Nationality',
    born: 'Born',
    number: 'Number',
    currentTeam: 'Current team',
    resultsBySeason: 'Results by season',
    seasonResults: 'Season results',
    noNumber: '—',
  },
  driversPage: {
    sortBy: 'Sort by',
    alphabetical: 'Alphabetical',
    championships: 'Championships won',
    wins: 'Grand Prix wins',
    firstYear: 'First year in F1',
    lastYear: 'Last year in F1',
    countryFilter: 'Country',
    teamFilter: 'Team',
    allCountries: 'All countries',
    allTeams: 'All teams',
    loadLastTeam: 'Show last team (slow)',
    loadingArchive: 'Loading the full driver archive…',
    loadingCareerStats: 'Crunching career stats across every season — this only happens once…',
    resultCount: 'drivers',
    someSeasonsFailed: '{n} season(s) failed to load — some career stats may be incomplete.',
    retry: 'Retry',
  },
  team: {
    country: 'Country',
    firstAppearance: 'First appearance',
    constructorsChampionships: "Constructors' titles",
    driversChampionships: "Drivers' titles",
    resultsBySeason: 'Results by season',
    racesEntered: 'Races entered',
  },
  circuit: {
    country: 'Country',
    city: 'City',
    length: 'Circuit length',
    corners: 'Corners',
    lapRecord: 'Lap record',
    firstParticipation: 'First Grand Prix',
    fastestLapBy: 'Record set by',
    realTrace: 'Real track outline',
    abstractTrace: 'Abstract placeholder shape — no real layout data available for this circuit',
  },
  season: {
    calendar: 'Calendar',
    round: 'Round',
    winner: 'Winner',
    races: 'races',
    jumpToSeason: 'Jump to season',
  },
  search: {
    placeholder: 'Search drivers, teams, circuits…',
    drivers: 'Drivers',
    teams: 'Teams',
    circuits: 'Circuits',
    noResults: 'No results found.',
    prompt: 'Start typing to search.',
  },
  status: {
    loading: 'Loading…',
    error: 'Something went wrong while loading this data.',
    retry: 'Try again',
    empty: 'No data available.',
    futureRound: 'This round has not been held yet — check back after the race.',
    slowNotice: 'The F1 data source is slow to respond — this is on their end, not this app.',
  },
  pagination: {
    previous: 'Previous',
    next: 'Next',
    page: 'Page',
  },
  notFound: {
    title: 'Off track',
    body: "This page doesn't exist. Let's get you back to the grid.",
    cta: 'Back to home',
  },
  language: {
    label: 'Language',
    pt: 'PT',
    en: 'EN',
  },
}

export default en
