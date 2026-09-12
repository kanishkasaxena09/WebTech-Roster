export const PROGRESS_ITEMS = [
  { key: 'documentation', label: 'Requirements & documentation' },
  { key: 'erd',           label: 'ERD / database model' },
  { key: 'prototype',     label: 'UI/UX prototype' },
  { key: 'coreBuild',     label: 'Core feature build' },
  { key: 'testing',       label: 'Testing & QA' },
  { key: 'deployment',    label: 'Deployment' },
]

export function emptyProgress() {
  const p = {}
  PROGRESS_ITEMS.forEach(i => { p[i.key] = false })
  return p
}

export const seedTeams = [
  {
    id: 't1', project: 'PropMatch', leader: 'Sudhanshu Mathur',
    members: ['Vishal Shrivastav', 'Suryansh Sharma'],
    description: 'A platform that matches renters with suitable properties.',
    username: 'propmatch', password: 'prop1234', progress: emptyProgress(),
  },
  {
    id: 't2', project: 'CampusFind', leader: 'Arifa Tahir',
    members: ['Aaradhya Saxena', 'Abhishek Saxena', 'Ajad Babu'],
    description: 'Helps students find and report lost items on campus.',
    username: 'campusfind', password: 'campus1234', progress: emptyProgress(),
  },
  {
    id: 't3', project: 'Job and Placement Portal', leader: 'Kanishka Saxena',
    members: ['Akanksha Raghav', 'Amit Maurya', 'Vijender Kumar'],
    description: 'Connects students with internship and placement opportunities.',
    username: 'jobportal', password: 'job1234', progress: emptyProgress(),
  },
  {
    id: 't4', project: 'BookMyShow Clone', leader: 'Prashant Gangwar',
    members: ['Naitik Bhardwaj'],
    description: 'A movie/event ticket booking web app.',
    username: 'bookmyshow', password: 'book1234', progress: emptyProgress(),
  },
]

export const seedAdmin = { username: 'admin', password: 'admin123' }

export const AVATAR_COLORS = ['#F0299B', '#8B5CF6', '#3FB8AF', '#E3B34F', '#5B9BD5', '#E37C4F']