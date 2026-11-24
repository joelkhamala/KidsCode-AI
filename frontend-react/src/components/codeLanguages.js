/**
 * The languages adult learners practise. "web" runs in the browser (HTML / CSS / JavaScript
 * with a live preview); Java, Python and SQL run on the server (backend/sandbox).
 */
export const SERVER_LANGUAGES = {
  java: {
    id: 'java', label: 'Java', icon: '☕', editor: 'java',
    tab: 'bg-red-600 text-white', chip: 'bg-red-100 text-red-800',
    placeholder: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Habari, Dunia!");\n    }\n}',
  },
  python: {
    id: 'python', label: 'Python', icon: '🐍', editor: 'python',
    tab: 'bg-blue-600 text-white', chip: 'bg-blue-100 text-blue-800',
    placeholder: 'print("Habari, Dunia!")',
  },
  sql: {
    id: 'sql', label: 'SQL', icon: '🗄️', editor: 'sql',
    tab: 'bg-purple-600 text-white', chip: 'bg-purple-100 text-purple-800',
    placeholder: 'SELECT name, city FROM Customers WHERE age > 18;',
  },
};

export const isServerLanguage = (language) => Boolean(SERVER_LANGUAGES[language]);

/**
 * Which language a course module uses. The lesson API also sends `language`; this is the
 * fallback for older responses.
 */
export function languageForModule(moduleId) {
  const m = Number(moduleId);
  if (m >= 109 && m <= 111) return 'java';
  if (m >= 112 && m <= 114) return 'python';
  if (m >= 115 && m <= 117) return 'sql';
  if (m >= 118 && m <= 120) return 'java';      // Algorithms & Data Structures
  if (m >= 121 && m <= 123) return 'python';    // Mathematics for Computing
  return 'web';
}
