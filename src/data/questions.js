export const ADMIN_PASSWORD = "Gits2026";

/**
 * Interview questions ordered Easy → Medium → Hard.
 * `difficulty`: "easy" | "medium" | "hard"
 */
export const questions = [
  // ── Easy ──────────────────────────────────────────────
  {
    id: "q1",
    type: "mcq",
    difficulty: "easy",
    prompt: "What is Flutter primarily used for?",
    options: [
      "Building cross-platform apps from a single codebase",
      "Writing server-side APIs only",
      "Managing relational databases",
      "Compiling Java bytecode",
    ],
    correctIndex: 0,
  },
  {
    id: "q2",
    type: "mcq",
    difficulty: "easy",
    prompt:
      "In Dart, which keyword declares a variable that cannot be reassigned after initialization?",
    options: ["var", "dynamic", "final", "late"],
    correctIndex: 2,
  },
  {
    id: "q3",
    type: "mcq",
    difficulty: "easy",
    prompt: "What does `async` / `await` help you do in Dart?",
    options: [
      "Compile Dart to native machine code",
      "Write asynchronous code that looks sequential",
      "Force all UI rebuilds to be synchronous",
      "Disable null safety",
    ],
    correctIndex: 1,
  },
  {
    id: "q4",
    type: "text",
    difficulty: "easy",
    prompt:
      "What is the main difference between StatelessWidget and StatefulWidget?",
  },
  {
    id: "q5",
    type: "code",
    difficulty: "easy",
    prompt: "The text color should be red. Edit the code to make the text red.",
    code: `Text(
    "Hello Flutter",
  )`,
    checks: {
      anyOf: [/style\s*:\s*TextStyle/i, /color\s*:\s*Colors\.red/i],
    },
  },
  {
    id: "q6",
    type: "code",
    difficulty: "easy",
    prompt: "The Text widget should become bold. Edit the code.",
    code: `Text("Flutter")`,
    checks: {
      anyOf: [/FontWeight\.bold/i],
    },
  },
  {
    id: "q7",
    type: "code",
    difficulty: "easy",
    prompt:
      "The button doesn't do anything. Edit the code to print 'Button Pressed' when tapped.",
    code: `ElevatedButton(
    onPressed: () {},
    child: Text("Click Me"),
  )`,
    checks: {
      anyOf: [/print\s*\(/i, /debugPrint\s*\(/i],
    },
  },
  {
    id: "q8",
    type: "code",
    difficulty: "easy",
    prompt: "The AppBar title should display 'Home'. Edit the code.",
    code: `Scaffold(
    appBar: AppBar(),
  )`,
    checks: {
      anyOf: [/title\s*:\s*Text\s*\(\s*["']Home["']\s*\)/i],
    },
  },
  {
    id: "q9",
    type: "code",
    difficulty: "easy",
    prompt: "The Row should have space between its children. Edit the code.",
    code: `Row(
    children: [
      Text("A"),
      Text("B"),
    ],
  )`,
    checks: {
      anyOf: [/mainAxisAlignment\s*:\s*MainAxisAlignment\.spaceBetween/i],
    },
  },
  {
    id: "q10",
    type: "code",
    difficulty: "easy",
    prompt: "The ListView should display 10 items instead of 5. Edit the code.",
    code: `ListView.builder(
    itemCount: 5,
    itemBuilder: (_, index) {
      return ListTile(
        title: Text("Item $index"),
      );
    },
  )`,
    checks: {
      anyOf: [/itemCount\s*:\s*10/i],
    },
  },
  {
    id: "q11",
    type: "code",
    difficulty: "easy",
    prompt:
      "The CircularProgressIndicator should appear in the center of the screen. Edit the code.",
    code: `Scaffold(
    body: CircularProgressIndicator(),
  )`,
    checks: {
      anyOf: [/Center\s*\(/i],
    },
  },
  {
    id: "q12",
    type: "code",
    difficulty: "easy",
    prompt:
      "Edit the code below so the text is centered on the screen. Continue after editing — Skip (only if unchanged) ends the exam.",
    code: `Widget build(BuildContext context) {
  return Column(
    children: [
      Text("I want to be in the center!"),
    ],
  );
}`,
    checks: {
      anyOf: [
        /mainAxisAlignment\s*:\s*MainAxisAlignment\.center/i,
        /Center\s*\(/,
        /Align\s*\([\s\S]*alignment\s*:\s*Alignment\.center/i,
        /crossAxisAlignment\s*:\s*CrossAxisAlignment\.center/i,
      ],
    },
  },

  // ── Medium ────────────────────────────────────────────
  {
    id: "q13",
    type: "code",
    difficulty: "medium",
    prompt:
      "The screen doesn’t update when the button is tapped. Edit the StatefulWidget to fix it. Continue after editing — Skip (only if unchanged) ends the exam.",
    code: `class CounterWidget extends StatefulWidget {
  @override
  _CounterWidgetState createState() => _CounterWidgetState();
}

class _CounterWidgetState extends State<CounterWidget> {
  int count = 0;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text("Count: $count"),
        ElevatedButton(
          onPressed: () {
            count++; // Incrementing the value
          },
          child: Text("Increment"),
        ),
      ],
    );
  }
}`,
    checks: {
      allOf: [/setState\s*\(/, /count\s*(\+\+|\+=\s*1)/],
    },
  },
  {
    id: "q14",
    type: "code",
    difficulty: "medium",
    prompt:
      "This code is buggy. Edit it so `fetchData()` works correctly with `main`. Continue after editing — Skip (only if unchanged) ends the exam.",
    code: `void main() {
  var data = fetchData();
  print(data);
}

Future<String> fetchData() async {
  await Future.delayed(Duration(seconds: 1));
  return "Hello World";
}`,
    checks: {
      allOf: [
        /await\s+fetchData\s*\(|fetchData\s*\(\s*\)\s*\.then\s*\(/i,
        /async|Future/i,
      ],
      anyOf: [
        /main\s*\(\s*\)\s*async/i,
        /async\s+(void\s+)?main/i,
        /Future\s*<[^>]*>\s*main/i,
        /fetchData\s*\(\s*\)\s*\.then\s*\(/i,
      ],
    },
  },
  {
    id: "q15",
    type: "code",
    difficulty: "medium",
    prompt:
      "The button should navigate to HomePage when pressed. Edit the code.",
    code: `ElevatedButton(
    onPressed: () {},
    child: Text("Go"),
  )`,
    checks: {
      anyOf: [/Navigator\.push/i, /MaterialPageRoute/i],
    },
  },
  {
    id: "q16",
    type: "code",
    difficulty: "medium",
    prompt:
      "The API request may throw an exception and crash the screen. Edit the code to handle the error.",
    code: `Future<void> loadUsers() async {
    final users = await api.getUsers();
  
    print(users);
  }`,
    checks: {
      anyOf: [/try\s*\{/i, /catch\s*\(/i],
    },
  },
  {
    id: "q17",
    type: "text",
    difficulty: "medium",
    prompt:
      "If a page has multiple text fields, what is the best way to implement it? Use this form as an example and describe your approach (Form, TextFormField, GlobalKey, validators, obscureText for password, keyboard types, focus/next field):\n\n• Name → text field\n• 2nd name → text field\n• Password → text field\n• Email → text field",
  },
  {
    id: "q18",
    type: "text",
    difficulty: "medium",
    prompt:
      "How do you handle errors in Flutter without crashing the UI? Mention approaches you use (e.g. try/catch with async work, Future.error handling, errorBuilder, FlutterError.onError, showing snackbars/dialogs, and keeping the widget tree stable).",
  },
  {
    id: "q19",
    type: "text",
    difficulty: "medium",
    prompt:
      "How do you approach debugging a Flutter layout or state issue you have never seen before?",
  },
  {
    id: "q20",
    type: "text",
    difficulty: "medium",
    prompt:
      "Describe a Flutter project you built. What packages or patterns did you use, and what was your role?",
  },
  {
    id: "q21",
    type: "text",
    difficulty: "medium",
    prompt:
      "Why do you want this Flutter/Dart role, and what do you hope to learn or improve?",
  },

  // ── Hard ──────────────────────────────────────────────
  {
    id: "q22",
    type: "text",
    difficulty: "hard",
    prompt:
      "Why does Flutter throw “BoxConstraints forces an infinite height” or “infinite width”? Give a common cause (e.g. unbounded constraints with ListView, Column, or Expanded in the wrong parent) and explain how you fix it properly.",
  },
  {
    id: "q23",
    type: "code",
    difficulty: "hard",
    prompt:
      "The ListView causes a layout error because it is inside a Column. Edit the code correctly.",
    code: `Column(
    children: [
      Text("Users"),
      ListView.builder(
        itemCount: 20,
        itemBuilder: (_, i) => ListTile(
          title: Text("User $i"),
        ),
      ),
    ],
  )`,
    checks: {
      anyOf: [/Expanded\s*\(/i, /Flexible\s*\(/i, /shrinkWrap\s*:\s*true/i],
    },
  },
  {
    id: "q24",
    type: "code",
    difficulty: "hard",
    prompt:
      "This UI fails to update when `counter` changes. Edit the code to fix the problem. Continue after editing — Skip (only if unchanged) ends the exam.",
    code: `class CounterDisplay extends StatelessWidget {
  final int counter;
  const CounterDisplay({required this.counter});

  @override
  Widget build(BuildContext context) {
    return Text("Count: $counter");
  }
}

// In the parent widget:
final widget = const CounterDisplay(counter: 0);

void _increment() {
  setState(() {
    // Logic to change counter...
  });
}`,
    checks: {
      allOf: [/CounterDisplay\s*\(/],
      noneOf: [/=\s*const\s+CounterDisplay\s*\(/],
    },
  },
  {
    id: "q25",
    type: "code",
    difficulty: "hard",
    prompt:
      "The screen should navigate to HomePage only after login() finishes successfully. Edit the code.",
    code: `ElevatedButton(
    onPressed: () {
      login();
  
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => HomePage(),
        ),
      );
    },
    child: Text("Login"),
  )`,
    checks: {
      allOf: [/await\s+login\s*\(/i],
      anyOf: [/async/i],
    },
  },
  {
    id: "q26",
    type: "text",
    difficulty: "hard",
    prompt:
      "Explain how you would structure state management in a mid-sized Flutter app (e.g. Provider, Riverpod, Bloc, or similar) and why.",
  },
  {
    id: "q27",
    type: "text",
    difficulty: "hard",
    prompt:
      "Design the architecture for a Flutter app that includes authentication, offline caching, REST APIs, and push notifications. Explain how you would organize the project folders, state management, repositories, dependency injection, and error handling.",
  },
  {
    id: "q28",
    type: "text",
    difficulty: "hard",
    prompt:
      "Explain what causes widgets to rebuild in Flutter. How would you reduce unnecessary rebuilds in a large application?",
  },
  {
    id: "q29",
    type: "code",
    difficulty: "hard",
    prompt:
      "Deleting an item from this ListView removes the wrong row because widget state is being reused. Edit the code to fix the issue.",
    code: `ListView.builder(
    itemCount: users.length,
    itemBuilder: (_, index) {
      return ListTile(
        title: Text(users[index].name),
      );
    },
  )`,
    checks: {
      anyOf: [/key\s*:/i, /ValueKey/i, /ObjectKey/i],
    },
  },
  {
    id: "q30",
    type: "text",
    difficulty: "hard",
    prompt:
      "Your Flutter screen contains a ListView with 1,000 items and scrolling feels slow. Explain how you would identify the bottleneck and optimize the screen.",
  },
];

export const objectBoxQuestions = [
  {
    id: "ob1",
    type: "mcq",
    difficulty: "objectbox",
    topic: "objectbox",
    prompt: "What is ObjectBox primarily used for in a Flutter app?",
    options: [
      "Local NoSQL / object database on device",
      "Remote REST API client only",
      "Compiling Dart to JavaScript",
      "Managing App Store releases",
    ],
    correctIndex: 0,
  },
  {
    id: "ob2",
    type: "mcq",
    difficulty: "objectbox",
    topic: "objectbox",
    prompt:
      "In an ObjectBox entity, what type should the `id` field normally be?",
    options: ["String", "int", "double", "bool"],
    correctIndex: 1,
  },
  {
    id: "ob3",
    type: "mcq",
    difficulty: "objectbox",
    topic: "objectbox",
    prompt: "Which annotation marks a Dart class as an ObjectBox entity?",
    options: ["@Table()", "@Entity()", "@Model()", "@Collection()"],
    correctIndex: 1,
  },
  {
    id: "ob4",
    type: "mcq",
    difficulty: "objectbox",
    topic: "objectbox",
    prompt:
      "Which command is commonly used to generate ObjectBox code after defining entities?",
    options: [
      "flutter objectbox generate",
      "dart run build_runner build",
      "flutter generate",
      "dart generate objectbox.g.dart",
    ],
    correctIndex: 2,
  },
  {
    id: "ob5",
    type: "text",
    difficulty: "objectbox",
    topic: "objectbox",
    prompt: 'What does a "UID" do in ObjectBox?',
  },
  {
    id: "ob6",
    type: "text",
    difficulty: "objectbox",
    topic: "objectbox",
    prompt: "What is the rule for the `id` field in an ObjectBox entity?",
  },
  {
    id: "ob7",
    type: "text",
    difficulty: "objectbox",
    topic: "objectbox",
    prompt:
      "Explain when you would use ObjectBox queries vs loading all objects and filtering in Dart. Give a short example scenario.",
  },

  // ── Code (3) ──────────────────────────────────────────
  {
    id: "ob8",
    type: "code",
    difficulty: "objectbox",
    topic: "objectbox",
    prompt:
      "How do you tell ObjectBox to index a specific field (like an email) for fast lookups? Edit the code.",
    code: `@Entity()
class Member {
  int id = 0;
  String email;
  
  Member({required this.email});
}`,
    checks: {
      anyOf: [/@Index\s*\(/i, /@Property\s*\([\s\S]*index/i],
      allOf: [/email/i],
    },
  },
  {
    id: "ob9",
    type: "code",
    difficulty: "objectbox",
    topic: "objectbox",
    prompt:
      "This entity is missing the ObjectBox entity annotation and a valid id. Edit the code so ObjectBox can use it.",
    code: `class Note {
  String title = '';
  String body = '';
}`,
    checks: {
      allOf: [/@Entity\s*\(/i, /\bint\s+id\b/i],
    },
  },
  {
    id: "ob10",
    type: "code",
    difficulty: "objectbox",
    topic: "objectbox",
    prompt:
      "Complete this query so it finds members whose email equals the given value (use ObjectBox query style).",
    code: `final box = store.box<Member>();

List<Member> findByEmail(String email) {
  // TODO: query by email
  return [];
}`,
    checks: {
      anyOf: [
        /\.query\s*\(/i,
        /Member_\.email/i,
        /equals\s*\(/i,
        /\.build\s*\(/i,
        /\.find\s*\(/i,
      ],
    },
  },
];

const EXAM_COUNTS = { easy: 4, medium: 3, hard: 3 };

function shuffle(list) {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Pick a fresh exam set: 4 easy, 3 medium, 3 hard (random within each tier).
 * Order is always Easy → Medium → Hard.
 */
export function pickExamQuestions(counts = EXAM_COUNTS, pool = questions) {
  const byDifficulty = { easy: [], medium: [], hard: [] };
  for (const q of pool) {
    const d = q.difficulty || "medium";
    if (byDifficulty[d]) byDifficulty[d].push(q);
  }

  const picked = [];
  for (const level of ["easy", "medium", "hard"]) {
    const need = counts[level] ?? 0;
    const available = byDifficulty[level];
    if (available.length < need) {
      throw new Error(
        `Not enough ${level} questions: need ${need}, have ${available.length}`,
      );
    }
    picked.push(...shuffle(available).slice(0, need));
  }
  return picked;
}

/** Returns true if edited code looks like a valid fix for the question. */
export function isCodeCorrect(question, code) {
  if (!question?.checks || typeof code !== "string") return false;
  const trimmed = code.trim();
  if (!trimmed || trimmed === question.code.trim()) return false;

  const { allOf = [], anyOf = [], noneOf = [] } = question.checks;

  const passAll = allOf.every((re) => re.test(trimmed));
  const passAny = anyOf.length === 0 || anyOf.some((re) => re.test(trimmed));
  const passNone = noneOf.every((re) => !re.test(trimmed));

  return passAll && passAny && passNone;
}
