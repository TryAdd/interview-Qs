export const ADMIN_PASSWORD = 'interview2026'

export const questions = [
  {
    id: 'q1',
    type: 'mcq',
    prompt: 'What does HTML stand for?',
    options: [
      'HyperText Markup Language',
      'HighTech Modern Language',
      'Home Tool Markup Language',
      'Hyperlink and Text Markup Language',
    ],
    correctIndex: 0,
  },
  {
    id: 'q2',
    type: 'text',
    prompt: 'Describe a project you are proud of and what your role was.',
  },
  {
    id: 'q3',
    type: 'mcq',
    prompt: 'Which HTTP method is typically used to update an existing resource?',
    options: ['GET', 'POST', 'PUT', 'DELETE'],
    correctIndex: 2,
  },
  {
    id: 'q4',
    type: 'text',
    prompt: 'How do you approach debugging a problem you have never seen before?',
  },
  {
    id: 'q5',
    type: 'mcq',
    prompt: 'What is the main purpose of version control (e.g. Git)?',
    options: [
      'To compile code faster',
      'To track changes and collaborate on code',
      'To host websites online',
      'To write unit tests automatically',
    ],
    correctIndex: 1,
  },
  {
    id: 'q6',
    type: 'text',
    prompt: 'Tell us about a time you worked on a team and how you handled a disagreement.',
  },
  {
    id: 'q7',
    type: 'mcq',
    prompt: 'In JavaScript, which keyword declares a block-scoped variable that cannot be reassigned?',
    options: ['var', 'let', 'const', 'static'],
    correctIndex: 2,
  },
  {
    id: 'q8',
    type: 'text',
    prompt: 'Why do you want this role, and what do you hope to learn?',
  },
]
