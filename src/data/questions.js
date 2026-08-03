export const ADMIN_PASSWORD = "interview2026";

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
];
