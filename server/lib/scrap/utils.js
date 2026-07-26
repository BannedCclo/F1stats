export const generateRaceId = (race, year) => {
  return `${race}_${year}`
}

// Position/grid fields scraped from BBC are sometimes non-numeric
// placeholders ("-" for a DNF's finishing position, "not available" for a
// grid that never got set) rather than a real number.
export const toIntOrNull = (value) => {
  if (value === null || value === undefined) return null
  const n = parseInt(value, 10)
  return Number.isNaN(n) ? null : n
}

export const toFloatOrNull = (value) => {
  if (value === null || value === undefined) return null
  const n = parseFloat(value)
  return Number.isNaN(n) ? null : n
}

// object array with the info of the current grid of the f1, includes drivers and his teams
export const grid = [
  {
    driver: "verstappen",
    team: "red_bull",
  },
  {
    driver: "lawson",
    team: "rb",
  },
  {
    driver: "hamilton",
    team: "ferrari",
  },
  {
    driver: "russell",
    team: "mercedes",
  },
  {
    driver: "sainz",
    team: "williams",
  },
  {
    driver: "leclerc",
    team: "ferrari",
  },
  {
    driver: "norris",
    team: "mclaren",
  },
  {
    driver: "piastri",
    team: "mclaren",
  },
  {
    driver: "bortoleto",
    team: "audi",
  },
  {
    driver: "hulkenberg",
    team: "audi",
  },
  {
    driver: "sainz",
    team: "williams",
  },
  {
    driver: "albon",
    team: "williams",
  },
  {
    driver: "alonso",
    team: "aston_martin",
  },
  {
    driver: "stroll",
    team: "aston_martin",
  },
  {
    driver: "ocon",
    team: "haas",
  },
  {
    driver: "bearman",
    team: "haas",
  },
  {
    driver: "colapinto",
    team: "alpine",
  },
  {
    driver: "gasly",
    team: "alpine",
  },
  {
    driver: "hadjar",
    team: "red_bull",
  },
  {
    driver: "perez",
    team: "cadillac",
  },
  {
    driver: "bottas",
    team: "cadillac",
  },
  {
    driver: "lindblad",
    team: "rb",
  },
  {
    driver: "oward",
    team: "mclaren",
  },
  {
    driver: "crawford",
    team: "aston_martin",
  },
]

export const exceptions = ["max verstappen", "kevin magnussen"]
export const teamExceptions = ["red bull", "aston martin"]

export const formatDriver = (driver) => {
  let driverId

  if (exceptions.includes(driver)) {
    driverId = driver.replace(" ", "_")
    return driverId
  } else if (driver === "carlos sainz jnr") {
    driverId = "sainz"
    return driverId
  } else if (driver === "zhou guanyu") {
    driverId = "zhou"
    return driverId
  } else if (driver === "crawford") {
    driverId = "jak_crawford"
    return driverId
  } else if (driver === "o'ward") {
    driverId = "oward"
    return driverId
  } else {
    driverId = driver.split(" ").pop()
    return driverId
  }
}

export const formatTeam = (team, driver = null) => {
  let teamId
  const formattedTeam = team?.trim().toLowerCase() || ""
  // Find the driver in the grid array
  if (driver) {
    // Handle driver exceptions
    const formattedDriver = exceptions.includes(driver)
      ? driver.replace(" ", "_")
      : driver

    // Find the driver in the grid array
    const driverEntry = grid.find((entry) => entry.driver === formattedDriver)

    // If a matching driver is found, use their team; otherwise, proceed with normal logic
    if (driverEntry) {
      return (teamId = driverEntry.team)
    }
  }

  // Default logic if driver is not provided or not found in the grid
  if (formattedTeam === "bulls" || formattedTeam === "racing bulls") {
    return (teamId = "rb")
  } else if (teamExceptions.includes(formattedTeam)) {
    return (teamId = formattedTeam.replace(" ", "_"))
  } else {
    teamId = formattedTeam.split(" ").pop()
    return teamId === "bulls" ? "rb" : teamId
  }
}
