export const ADMIN_PASSWORD = "Gits2026";

export const questions = [
  {
    id: "q1",
    type: "mcq",
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
    type: "text",
    prompt:
      "What is the main difference between StatelessWidget and StatefulWidget?",
    // options: [
    //   'StatelessWidget can rebuild when its own state changes; StatefulWidget cannot',
    //   'StatefulWidget holds mutable state that can change over time; StatelessWidget depends only on its configuration (props) and does not manage its own mutable state',
    //   'StatelessWidget is for Android only; StatefulWidget is for iOS only',
    //   'There is no difference — both manage state the same way',
    // ],
    // correctIndex: 1,
  },
  {
    id: "q3",
    type: "text",
    prompt:
      "Describe a Flutter project you built. What packages or patterns did you use, and what was your role?",
  },
  {
    id: "q4",
    type: "text",
    prompt:
      "How do you handle errors in Flutter without crashing the UI? Mention approaches you use (e.g. try/catch with async work, Future.error handling, errorBuilder, FlutterError.onError, showing snackbars/dialogs, and keeping the widget tree stable).",
  },
  {
    id: "q5",
    type: "text",
    prompt:
      "Why does Flutter throw “BoxConstraints forces an infinite height” or “infinite width”? Give a common cause (e.g. unbounded constraints with ListView, Column, or Expanded in the wrong parent) and explain how you fix it properly.",
  },
  {
    id: "q6",
    type: "text",
    prompt:
      "If a page has multiple text fields, what is the best way to implement it? Use this form as an example and describe your approach (Form, TextFormField, GlobalKey, validators, obscureText for password, keyboard types, focus/next field):\n\n• Name → text field\n• 2nd name → text field\n• Password → text field\n• Email → text field",
  },
  {
    id: "q7",
    type: "mcq",
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
    id: "q8",
    type: "text",
    prompt:
      "Explain how you would structure state management in a mid-sized Flutter app (e.g. Provider, Riverpod, Bloc, or similar) and why.",
  },
  {
    id: "q9",
    type: "mcq",
    prompt:
      "In Dart, which keyword declares a variable that cannot be reassigned after initialization?",
    options: ["var", "dynamic", "final", "late"],
    correctIndex: 2,
  },
  {
    id: "q10",
    type: "text",
    prompt:
      "How do you approach debugging a Flutter layout or state issue you have never seen before?",
  },
  {
    id: "q11",
    type: "text",
    prompt:
      "Why do you want this Flutter/Dart role, and what do you hope to learn or improve?",
  },
  {
    id: "q12",
    type: "code",
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
  {
    id: "q13",
    type: "code",
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
    id: "q14",
    type: "code",
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
    id: "q15",
    type: "code",
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
];

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
