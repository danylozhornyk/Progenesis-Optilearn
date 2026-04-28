import { PrismaClient } from '../generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import 'dotenv/config';
import { storage, initStorage } from '../src/storage';

// ── Image helpers ─────────────────────────────────────────────

async function saveImage(filename: string, svg: string): Promise<string> {
  return storage.save(filename, Buffer.from(svg, 'utf-8'), 'image/svg+xml');
}

function avatarSvg(letter: string, c1: string, c2: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${c1}"/>
      <stop offset="100%" stop-color="${c2}"/>
    </linearGradient>
  </defs>
  <circle cx="100" cy="100" r="100" fill="url(#g)"/>
  <text x="100" y="136" font-family="system-ui,sans-serif" font-size="96" font-weight="700"
        fill="white" text-anchor="middle" dominant-baseline="auto">${letter}</text>
</svg>`;
}

function courseCoverSvg(discipline: 'graph' | 'numerical' | 'optimization'): string {
  if (discipline === 'graph') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 220">
  <rect width="400" height="220" fill="#0F172A"/>
  <!-- edges -->
  <line x1="70" y1="55"  x2="200" y2="110" stroke="#3B82F6" stroke-width="1.5" opacity="0.55"/>
  <line x1="200" y1="110" x2="330" y2="60"  stroke="#3B82F6" stroke-width="1.5" opacity="0.55"/>
  <line x1="200" y1="110" x2="290" y2="185" stroke="#3B82F6" stroke-width="1.5" opacity="0.55"/>
  <line x1="70"  y1="55"  x2="130" y2="175" stroke="#3B82F6" stroke-width="1.5" opacity="0.55"/>
  <line x1="130" y1="175" x2="290" y2="185" stroke="#3B82F6" stroke-width="1.5" opacity="0.55"/>
  <line x1="330" y1="60"  x2="360" y2="155" stroke="#3B82F6" stroke-width="1.5" opacity="0.55"/>
  <line x1="290" y1="185" x2="360" y2="155" stroke="#3B82F6" stroke-width="1.5" opacity="0.55"/>
  <line x1="200" y1="110" x2="130" y2="175" stroke="#60A5FA" stroke-width="1"   opacity="0.35"/>
  <!-- nodes -->
  <circle cx="70"  cy="55"  r="13" fill="#1D4ED8" stroke="#60A5FA" stroke-width="2"/>
  <circle cx="200" cy="110" r="18" fill="#1E40AF" stroke="#93C5FD" stroke-width="2.5"/>
  <circle cx="330" cy="60"  r="13" fill="#1D4ED8" stroke="#60A5FA" stroke-width="2"/>
  <circle cx="130" cy="175" r="11" fill="#1D4ED8" stroke="#60A5FA" stroke-width="2"/>
  <circle cx="290" cy="185" r="13" fill="#1D4ED8" stroke="#60A5FA" stroke-width="2"/>
  <circle cx="360" cy="155" r="10" fill="#1D4ED8" stroke="#60A5FA" stroke-width="2"/>
  <!-- label -->
  <text x="16" y="210" font-family="system-ui,sans-serif" font-size="12" fill="#475569">Graph Theory</text>
</svg>`;
  }

  if (discipline === 'numerical') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 220">
  <rect width="400" height="220" fill="#0F172A"/>
  <!-- grid lines -->
  <line x1="40" y1="20"  x2="40"  y2="195" stroke="#1E293B" stroke-width="1"/>
  <line x1="40" y1="195" x2="385" y2="195" stroke="#1E293B" stroke-width="1"/>
  <line x1="40" y1="110" x2="385" y2="110" stroke="#1E293B" stroke-width="1" stroke-dasharray="4,4"/>
  <!-- axes -->
  <line x1="40"  y1="195" x2="385" y2="195" stroke="#334155" stroke-width="1.5"/>
  <line x1="40"  y1="20"  x2="40"  y2="195" stroke="#334155" stroke-width="1.5"/>
  <!-- sine wave -->
  <path d="M 40 110 C 67 110 67 35 97 35 C 127 35 127 185 157 185
           C 187 185 187 35  217 35  C 247 35  247 185 277 185
           C 307 185 307 35  337 35  C 357 35  368 75  378 95"
        fill="none" stroke="#38BDF8" stroke-width="2.5" stroke-linecap="round"/>
  <!-- second curve (damped oscillation) -->
  <path d="M 40 110 C 60 110 67 65 97 65 C 127 65 137 155 157 155
           C 177 155 192 80  217 80  C 242 80  252 140 277 140
           C 302 140 315 105 337 105"
        fill="none" stroke="#818CF8" stroke-width="1.5" opacity="0.65" stroke-linecap="round"/>
  <!-- bisection dots -->
  <circle cx="97"  cy="195" r="3" fill="#F59E0B"/>
  <circle cx="157" cy="195" r="3" fill="#F59E0B"/>
  <circle cx="127" cy="195" r="3" fill="#F59E0B" opacity="0.7"/>
  <line x1="97"  y1="35"  x2="97"  y2="195" stroke="#F59E0B" stroke-width="1" opacity="0.3" stroke-dasharray="3,3"/>
  <line x1="157" y1="185" x2="157" y2="195" stroke="#F59E0B" stroke-width="1" opacity="0.3" stroke-dasharray="3,3"/>
  <text x="16" y="212" font-family="system-ui,sans-serif" font-size="12" fill="#475569">Numerical Methods</text>
</svg>`;
  }

  // optimization
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 220">
  <defs>
    <radialGradient id="bg" cx="56%" cy="50%" r="58%">
      <stop offset="0%" stop-color="#1E1B4B"/>
      <stop offset="100%" stop-color="#0F172A"/>
    </radialGradient>
  </defs>
  <rect width="400" height="220" fill="url(#bg)"/>
  <!-- contour ellipses (largest → smallest) -->
  <ellipse cx="224" cy="112" rx="168" ry="95"  fill="none" stroke="#4338CA" stroke-width="1"   opacity="0.35"/>
  <ellipse cx="224" cy="112" rx="128" ry="70"  fill="none" stroke="#4F46E5" stroke-width="1.2" opacity="0.45"/>
  <ellipse cx="224" cy="112" rx="92"  ry="50"  fill="none" stroke="#6366F1" stroke-width="1.4" opacity="0.55"/>
  <ellipse cx="224" cy="112" rx="60"  ry="32"  fill="none" stroke="#818CF8" stroke-width="1.5" opacity="0.65"/>
  <ellipse cx="224" cy="112" rx="32"  ry="17"  fill="none" stroke="#A5B4FC" stroke-width="1.5" opacity="0.75"/>
  <ellipse cx="224" cy="112" rx="12"  ry="6.5" fill="none" stroke="#C7D2FE" stroke-width="1.5" opacity="0.85"/>
  <!-- gradient-descent path (dashed amber) -->
  <path d="M 68 52 Q 110 78 152 96 Q 188 110 210 112" fill="none"
        stroke="#F59E0B" stroke-width="2" stroke-dasharray="5,3" stroke-linecap="round" opacity="0.9"/>
  <!-- waypoint dots along path -->
  <circle cx="68"  cy="52"  r="4" fill="#F59E0B" opacity="0.85"/>
  <circle cx="110" cy="72"  r="3.5" fill="#F59E0B" opacity="0.75"/>
  <circle cx="152" cy="92"  r="3"   fill="#F59E0B" opacity="0.65"/>
  <circle cx="188" cy="108" r="3"   fill="#F59E0B" opacity="0.55"/>
  <!-- minimum marker -->
  <circle cx="224" cy="112" r="7"   fill="#F59E0B"/>
  <circle cx="224" cy="112" r="3.5" fill="white"/>
  <text x="16" y="212" font-family="system-ui,sans-serif" font-size="12" fill="#475569">Optimization Methods</text>
</svg>`;
}

function achievementSvg(type: 'first-pass' | 'perfect-score' | 'comeback'): string {
  if (type === 'first-pass') {
    // Gold badge with a white star
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#F59E0B"/>
      <stop offset="100%" stop-color="#D97706"/>
    </linearGradient>
  </defs>
  <circle cx="40" cy="40" r="38" fill="url(#g)" stroke="#92400E" stroke-width="1.5"/>
  <!-- 5-point star -->
  <polygon points="40,12 47.1,30.3 66.6,31.4 51.4,43.7 56.5,62.7 40,52 23.5,62.7 28.6,43.7 13.4,31.4 32.9,30.3"
           fill="white" opacity="0.95"/>
</svg>`;
  }

  if (type === 'perfect-score') {
    // Indigo badge with a white gem/diamond
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#6366F1"/>
      <stop offset="100%" stop-color="#4F46E5"/>
    </linearGradient>
  </defs>
  <circle cx="40" cy="40" r="38" fill="url(#g)" stroke="#3730A3" stroke-width="1.5"/>
  <!-- gem: top facet + body -->
  <polygon points="40,14 58,34 40,66 22,34" fill="none" stroke="white" stroke-width="2" stroke-linejoin="round"/>
  <polygon points="28,34 40,14 52,34" fill="white" opacity="0.4"/>
  <polygon points="28,34 40,66 22,34" fill="white" opacity="0.25"/>
  <polygon points="52,34 40,66 58,34" fill="white" opacity="0.15"/>
  <line x1="28" y1="34" x2="52" y2="34" stroke="white" stroke-width="1.5" opacity="0.7"/>
</svg>`;
  }

  // comeback — emerald badge with a circular arrow
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#10B981"/>
      <stop offset="100%" stop-color="#059669"/>
    </linearGradient>
  </defs>
  <circle cx="40" cy="40" r="38" fill="url(#g)" stroke="#065F46" stroke-width="1.5"/>
  <!-- circular arrow arc (270° sweep) -->
  <path d="M 40 18 A 22 22 0 1 1 18 40" fill="none" stroke="white" stroke-width="4"
        stroke-linecap="round"/>
  <!-- arrowhead pointing down-left at (18,40) -->
  <polyline points="10,32 18,40 26,32" fill="none" stroke="white" stroke-width="4"
            stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱  Seeding database...\n');

  // ── Initialise storage (creates S3 bucket when STORAGE_PROVIDER=s3) ──
  await initStorage();

  // ── Generate & save static images ───────────────────────────
  const imgAdminAvatar  = await saveImage('avatar-admin.svg',              avatarSvg('A', '#4F46E5', '#7C3AED'));
  const imgAliceAvatar  = await saveImage('avatar-alice.svg',              avatarSvg('A', '#EC4899', '#F43F5E'));
  const imgBobAvatar    = await saveImage('avatar-bob.svg',                avatarSvg('B', '#10B981', '#0EA5E9'));
  const imgCourseGraph  = await saveImage('course-graph.svg',              courseCoverSvg('graph'));
  const imgCourseNum    = await saveImage('course-numerical.svg',          courseCoverSvg('numerical'));
  const imgCourseOpt    = await saveImage('course-optimization.svg',       courseCoverSvg('optimization'));
  const imgAchFirst     = await saveImage('achievement-first-pass.svg',    achievementSvg('first-pass'));
  const imgAchPerfect   = await saveImage('achievement-perfect-score.svg', achievementSvg('perfect-score'));
  const imgAchComeback  = await saveImage('achievement-comeback.svg',      achievementSvg('comeback'));
  console.log('✔  Images saved to storage');

  // ── Wipe in dependency order ─────────────────────────────────
  await prisma.aiRecommendation.deleteMany();
  await prisma.achievement.deleteMany();
  await prisma.userProgress.deleteMany();
  await prisma.testSubmission.deleteMany();
  await prisma.task.deleteMany();
  await prisma.test.deleteMany();
  await prisma.lesson.deleteMany();
  await prisma.course.deleteMany();
  await prisma.graph.deleteMany();
  await prisma.emailVerification.deleteMany();
  await prisma.passwordReset.deleteMany();
  await prisma.user.deleteMany();

  // ── Users ────────────────────────────────────────────────────
  // All share the same password so dev login is trivial
  const passwordHash = await bcrypt.hash('Dev123!', 10);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@optilearn.dev',
      passwordHash,
      role: 'ADMIN',
      fullName: 'Admin User',
      isEmailVerified: true,
      avatarUrl: imgAdminAvatar,
      preferences: { locale: 'en', theme: 'light' },
    },
  });

  const alice = await prisma.user.create({
    data: {
      email: 'alice@optilearn.dev',
      passwordHash,
      role: 'STUDENT',
      fullName: 'Alice Kovalenko',
      isEmailVerified: true,
      avatarUrl: imgAliceAvatar,
      preferences: { locale: 'uk', theme: 'dark' },
    },
  });

  await prisma.user.create({
    data: {
      email: 'bob@optilearn.dev',
      passwordHash,
      role: 'STUDENT',
      fullName: 'Bob Smith',
      isEmailVerified: true,
      avatarUrl: imgBobAvatar,
      preferences: { locale: 'en', theme: 'light' },
    },
  });

  console.log('✔  Users created');

  // ── System graphs (userId = null → templates) ────────────────
  const undirectedGraph = await prisma.graph.create({
    data: {
      userId: null,
      title: 'Simple Undirected Graph (5 vertices, 6 edges)',
      graphType: 'UNDIRECTED',
      vertices: [
        { id: 'v1', label: 'A', x: 100, y: 200 },
        { id: 'v2', label: 'B', x: 250, y: 100 },
        { id: 'v3', label: 'C', x: 400, y: 200 },
        { id: 'v4', label: 'D', x: 250, y: 300 },
        { id: 'v5', label: 'E', x: 175, y: 175 },
      ],
      edges: [
        { source: 'v1', target: 'v2' },
        { source: 'v1', target: 'v4' },
        { source: 'v2', target: 'v3' },
        { source: 'v2', target: 'v5' },
        { source: 'v3', target: 'v4' },
        { source: 'v4', target: 'v5' },
      ],
      vertexCount: 5,
      edgeCount: 6,
    },
  });

  const directedGraph = await prisma.graph.create({
    data: {
      userId: null,
      title: 'Simple Directed Graph — S→A→T, S→B→T',
      graphType: 'DIRECTED',
      vertices: [
        { id: 'v1', label: 'S', x: 100, y: 200 },
        { id: 'v2', label: 'A', x: 250, y: 100 },
        { id: 'v3', label: 'B', x: 250, y: 300 },
        { id: 'v4', label: 'T', x: 400, y: 200 },
      ],
      edges: [
        { source: 'v1', target: 'v2' },
        { source: 'v1', target: 'v3' },
        { source: 'v2', target: 'v4' },
        { source: 'v3', target: 'v4' },
        { source: 'v2', target: 'v3' },
      ],
      vertexCount: 4,
      edgeCount: 5,
    },
  });

  const weightedGraph = await prisma.graph.create({
    data: {
      userId: null,
      title: 'Weighted Graph — Shortest Path Example',
      graphType: 'WEIGHTED',
      vertices: [
        { id: 'v1', label: 'A', x: 100, y: 200 },
        { id: 'v2', label: 'B', x: 300, y: 100 },
        { id: 'v3', label: 'C', x: 300, y: 300 },
        { id: 'v4', label: 'D', x: 500, y: 200 },
      ],
      edges: [
        { source: 'v1', target: 'v2', weight: 4, label: '4' },
        { source: 'v1', target: 'v3', weight: 2, label: '2' },
        { source: 'v2', target: 'v4', weight: 3, label: '3' },
        { source: 'v3', target: 'v4', weight: 5, label: '5' },
        { source: 'v2', target: 'v3', weight: 1, label: '1' },
      ],
      vertexCount: 4,
      edgeCount: 5,
    },
  });

  console.log('✔  Graphs created');

  // ─────────────────────────────────────────────────────────────
  // COURSE 1 — Introduction to Graph Theory (BEGINNER)
  // ─────────────────────────────────────────────────────────────
  const course1 = await prisma.course.create({
    data: {
      authorId: admin.id,
      title: 'Introduction to Graph Theory',
      description:
        'Learn the fundamentals of graph theory: vertices, edges, paths, and traversal algorithms used throughout computer science and mathematics.',
      discipline: 'Graph Theory',
      difficulty: 'BEGINNER',
      status: 'PUBLISHED',
      isVisible: true,
      coverImageUrl: imgCourseGraph,
    },
  });

  // Lesson 1-1: Basic Concepts
  const lesson1_1 = await prisma.lesson.create({
    data: {
      courseId: course1.id,
      title: 'Basic Concepts',
      orderIndex: 1,
      isMandatory: true,
      estimatedMinutes: 20,
      content: [
        { type: 'text', value: 'A graph G = (V, E) consists of a set of vertices V and a set of edges E connecting pairs of vertices.' },
        { type: 'latex', value: 'G = (V,\\, E)' },
        { type: 'text', value: 'Graphs can be directed (edges have direction) or undirected. They can also carry weights on edges.' },
        { type: 'text', value: 'The degree of a vertex is the number of edges incident to it.' },
        { type: 'latex', value: '\\deg(v) = |\\{e \\in E : v \\in e\\}|' },
      ],
    },
  });

  const test1_1 = await prisma.test.create({
    data: {
      lessonId: lesson1_1.id,
      title: 'Graph Fundamentals Quiz',
      description: 'Test your understanding of basic graph vocabulary and structure.',
      timeLimitMin: 10,
      maxAttempts: 3,
      passingScore: 60,
      shuffleQuestions: false,
    },
  });

  const t1_1_1 = await prisma.task.create({
    data: {
      testId: test1_1.id,
      orderIndex: 1,
      taskType: 'SINGLE_CHOICE',
      statement: 'What is a vertex in a graph?',
      options: [
        { id: 'a', text: 'A connection between two nodes' },
        { id: 'b', text: 'A fundamental unit (node) of a graph' },
        { id: 'c', text: 'A path from one node to another' },
        { id: 'd', text: 'A subset of edges' },
      ],
      correctAnswer: 'b',
      maxScore: 1,
      explanation: 'A vertex (or node) is the fundamental unit of a graph. Edges are the connections between vertices.',
      hints: [
        { strength: 100, text: 'In G = (V, E), what does V represent? Each element of V is a …' },
        { strength: 50, text: 'Think of the dots in a graph diagram — they are called vertices.' },
        { strength: 0, text: 'A vertex is the basic point or node that edges connect together.' },
      ],
    },
  });

  const t1_1_2 = await prisma.task.create({
    data: {
      testId: test1_1.id,
      orderIndex: 2,
      taskType: 'MULTIPLE_CHOICE',
      statement: 'Which of the following are standard types of graphs? (Select all that apply)',
      options: [
        { id: 'a', text: 'Directed graph' },
        { id: 'b', text: 'Undirected graph' },
        { id: 'c', text: 'Diagonal graph' },
        { id: 'd', text: 'Weighted graph' },
        { id: 'e', text: 'Circular graph' },
      ],
      correctAnswer: JSON.stringify(['a', 'b', 'd']),
      maxScore: 2,
      explanation: 'Directed, undirected, and weighted are standard graph types. "Diagonal" and "circular" are not recognised graph classifications.',
      hints: [
        { strength: 100, text: 'Think about two properties an edge can have: direction and weight. Each gives rise to a graph type.' },
        { strength: 50, text: 'Three options are valid standard types — look for terms used in textbooks: directed, undirected, weighted.' },
        { strength: 0, text: 'The correct answers are: directed, undirected, and weighted.' },
      ],
    },
  });

  const t1_1_3 = await prisma.task.create({
    data: {
      testId: test1_1.id,
      graphId: undirectedGraph.id,
      orderIndex: 3,
      taskType: 'OPEN_ANSWER',
      statement: 'Look at the graph shown. How many edges does it have?',
      correctAnswer: '6',
      answerTolerance: 0,
      maxScore: 1,
      explanation: 'Count each line: A-B, A-D, B-C, B-E, C-D, D-E = 6 edges.',
      hints: [
        { strength: 100, text: 'Count every line segment connecting two vertices in the diagram.' },
        { strength: 50, text: 'There are more than 4 but fewer than 8 edges. Count systematically from each vertex.' },
        { strength: 0, text: 'The graph has exactly 6 edges.' },
      ],
    },
  });

  // Lesson 1-2: Graph Traversal
  const lesson1_2 = await prisma.lesson.create({
    data: {
      courseId: course1.id,
      prerequisiteId: lesson1_1.id,
      title: 'Graph Traversal',
      orderIndex: 2,
      isMandatory: true,
      estimatedMinutes: 30,
      content: [
        { type: 'text', value: 'Graph traversal means visiting all vertices systematically. The two fundamental strategies are BFS and DFS.' },
        { type: 'text', value: 'BFS (Breadth-First Search) explores all neighbours at the current depth level before going deeper. It uses a queue.' },
        { type: 'text', value: 'DFS (Depth-First Search) goes as deep as possible along each branch before backtracking. It uses a stack (or recursion).' },
        { type: 'latex', value: '\\text{BFS: queue (FIFO)} \\quad \\text{DFS: stack (LIFO)}' },
      ],
    },
  });

  const test1_2 = await prisma.test.create({
    data: {
      lessonId: lesson1_2.id,
      title: 'Traversal Algorithms Quiz',
      description: 'Check your understanding of BFS and DFS.',
      timeLimitMin: 15,
      maxAttempts: 3,
      passingScore: 60,
      shuffleQuestions: true,
    },
  });

  const t1_2_1 = await prisma.task.create({
    data: {
      testId: test1_2.id,
      orderIndex: 1,
      taskType: 'SINGLE_CHOICE',
      statement: 'Which traversal algorithm uses a queue as its primary data structure?',
      options: [
        { id: 'a', text: 'Depth-First Search (DFS)' },
        { id: 'b', text: 'Breadth-First Search (BFS)' },
        { id: 'c', text: 'Both BFS and DFS' },
        { id: 'd', text: 'Neither' },
      ],
      correctAnswer: 'b',
      maxScore: 1,
      explanation: 'BFS uses a FIFO queue to process vertices level by level. DFS uses a LIFO stack (or recursion).',
      hints: [
        { strength: 100, text: 'BFS explores neighbours layer by layer. What data structure processes items in the order they arrive (FIFO)?' },
        { strength: 50, text: 'A queue is first-in-first-out. Which traversal visits all neighbours before going deeper — that one uses a queue.' },
        { strength: 0, text: 'BFS uses a queue. DFS uses a stack.' },
      ],
    },
  });

  const t1_2_2 = await prisma.task.create({
    data: {
      testId: test1_2.id,
      graphId: directedGraph.id,
      orderIndex: 2,
      taskType: 'OPEN_ANSWER',
      statement: 'In the directed graph shown, what is the out-degree of vertex S (number of edges leaving S)?',
      correctAnswer: '2',
      answerTolerance: 0,
      maxScore: 1,
      explanation: 'S has directed edges to A and B, so its out-degree is 2.',
      hints: [
        { strength: 100, text: 'Out-degree = number of arrows that start at S and point away from it.' },
        { strength: 50, text: 'S points to exactly 2 other vertices. Count the arrowheads leaving S.' },
        { strength: 0, text: 'S → A and S → B. Out-degree of S = 2.' },
      ],
    },
  });

  const t1_2_3 = await prisma.task.create({
    data: {
      testId: test1_2.id,
      orderIndex: 3,
      taskType: 'SINGLE_CHOICE',
      statement: 'A graph where there exists a path between every pair of vertices is called:',
      options: [
        { id: 'a', text: 'A complete graph' },
        { id: 'b', text: 'A connected graph' },
        { id: 'c', text: 'A planar graph' },
        { id: 'd', text: 'A bipartite graph' },
      ],
      correctAnswer: 'b',
      maxScore: 1,
      explanation: 'A connected graph has a path between every pair of vertices. A complete graph is stricter — it requires a direct edge between every pair.',
      hints: [
        { strength: 100, text: 'The key property: you can reach any vertex from any other vertex via some sequence of edges.' },
        { strength: 50, text: 'The term literally describes what it means — the graph is "connected" throughout.' },
        { strength: 0, text: 'It is called a connected graph.' },
      ],
    },
  });

  // Lesson 1-3: Shortest Paths
  const lesson1_3 = await prisma.lesson.create({
    data: {
      courseId: course1.id,
      prerequisiteId: lesson1_2.id,
      title: 'Shortest Paths',
      orderIndex: 3,
      isMandatory: false,
      estimatedMinutes: 40,
      content: [
        { type: 'text', value: "Dijkstra's algorithm finds the shortest path from a source vertex to all other vertices in a weighted graph with non-negative edge weights." },
        { type: 'latex', value: 'd[v] = \\min_{u \\in \\text{visited}} \\bigl(d[u] + w(u,v)\\bigr)' },
        { type: 'text', value: 'At each step, pick the unvisited vertex with the smallest known distance and relax its neighbours.' },
      ],
    },
  });

  const test1_3 = await prisma.test.create({
    data: {
      lessonId: lesson1_3.id,
      title: "Shortest Paths Quiz",
      timeLimitMin: 20,
      maxAttempts: 3,
      passingScore: 60,
    },
  });

  await prisma.task.create({
    data: {
      testId: test1_3.id,
      graphId: weightedGraph.id,
      orderIndex: 1,
      taskType: 'OPEN_ANSWER',
      statement: "Using the weighted graph shown, what is the shortest path distance from A to D?",
      correctAnswer: '7',
      answerTolerance: 0,
      maxScore: 2,
      explanation: 'Path A→B→D costs 4+3=7. Path A→C→D costs 2+5=7. Path A→B→C→D costs 4+1+5=10. Minimum is 7.',
      hints: [
        { strength: 100, text: 'List all paths from A to D and sum the edge weights for each. Pick the smallest total.' },
        { strength: 50, text: 'There are two equally short paths: A→B→D (cost 4+3) and A→C→D (cost 2+5). Both equal the same value.' },
        { strength: 0, text: 'The shortest distance is 7 (via A→B→D or A→C→D).' },
      ],
    },
  });

  await prisma.task.create({
    data: {
      testId: test1_3.id,
      orderIndex: 2,
      taskType: 'SINGLE_CHOICE',
      statement: "Dijkstra's algorithm fails when the graph contains:",
      options: [
        { id: 'a', text: 'Undirected edges' },
        { id: 'b', text: 'Negative-weight edges' },
        { id: 'c', text: 'Disconnected components' },
        { id: 'd', text: 'Self-loops with weight 0' },
      ],
      correctAnswer: 'b',
      maxScore: 1,
      explanation: "Dijkstra's greedy relaxation assumes that once a vertex is finalised its distance cannot decrease — a negative edge can violate this. Use Bellman-Ford for graphs with negative weights.",
      hints: [
        { strength: 100, text: "Dijkstra's makes a greedy assumption: a finalised distance won't get smaller. Which type of edge could break that assumption?" },
        { strength: 50, text: 'If an edge has negative weight, a later path could turn out shorter than one already finalised — causing incorrect results.' },
        { strength: 0, text: "Dijkstra's fails with negative-weight edges. Use Bellman-Ford instead." },
      ],
    },
  });

  console.log('✔  Course 1 (Graph Theory) created');

  // ─────────────────────────────────────────────────────────────
  // COURSE 2 — Numerical Methods (BEGINNER)
  // ─────────────────────────────────────────────────────────────
  const course2 = await prisma.course.create({
    data: {
      authorId: admin.id,
      title: 'Numerical Methods',
      description:
        'Explore root-finding, numerical integration, and interpolation methods used in scientific computing.',
      discipline: 'Numerical Methods',
      difficulty: 'BEGINNER',
      status: 'PUBLISHED',
      isVisible: true,
      coverImageUrl: imgCourseNum,
    },
  });

  const lesson2_1 = await prisma.lesson.create({
    data: {
      courseId: course2.id,
      title: 'Root Finding Methods',
      orderIndex: 1,
      isMandatory: true,
      estimatedMinutes: 25,
      content: [
        { type: 'text', value: 'Root-finding algorithms locate x such that f(x) = 0.' },
        { type: 'latex', value: 'f(x) = 0' },
        { type: 'text', value: 'The Bisection Method halves an interval [a, b] where f(a) and f(b) have opposite signs, guaranteed by the Intermediate Value Theorem.' },
        { type: 'latex', value: 'c = \\frac{a + b}{2}' },
        { type: 'text', value: "Newton's method uses the derivative for quadratic convergence near the root." },
        { type: 'latex', value: 'x_{n+1} = x_n - \\frac{f(x_n)}{f\'(x_n)}' },
      ],
    },
  });

  const test2_1 = await prisma.test.create({
    data: {
      lessonId: lesson2_1.id,
      title: 'Root Finding Quiz',
      description: "Test your knowledge of the bisection and Newton's methods.",
      timeLimitMin: 15,
      maxAttempts: 3,
      passingScore: 60,
    },
  });

  await prisma.task.create({
    data: {
      testId: test2_1.id,
      orderIndex: 1,
      taskType: 'OPEN_ANSWER',
      statement: 'Applying one step of bisection to f(x) = x² − 2 on [1, 2], what is the midpoint c?',
      correctAnswer: '1.5',
      answerTolerance: 0.001,
      maxScore: 1,
      explanation: 'c = (a + b) / 2 = (1 + 2) / 2 = 1.5',
      hints: [
        { strength: 100, text: 'Use c = (a + b) / 2 with a = 1, b = 2.' },
        { strength: 50, text: 'The midpoint of [1, 2] is just the average of the two endpoints.' },
        { strength: 0, text: '(1 + 2) / 2 = 1.5' },
      ],
    },
  });

  await prisma.task.create({
    data: {
      testId: test2_1.id,
      orderIndex: 2,
      taskType: 'SINGLE_CHOICE',
      statement: "What is the main convergence advantage of Newton's method over bisection?",
      options: [
        { id: 'a', text: 'It always converges regardless of initial guess' },
        { id: 'b', text: 'It converges quadratically near the root' },
        { id: 'c', text: 'It does not require computing any derivatives' },
        { id: 'd', text: 'It works on intervals without sign change' },
      ],
      correctAnswer: 'b',
      maxScore: 1,
      explanation: "Newton's method doubles the number of correct significant digits each iteration (quadratic convergence). Bisection only gains one bit per iteration (linear convergence).",
      hints: [
        { strength: 100, text: "How does the error shrink each iteration in Newton's method — linearly or as its square?" },
        { strength: 50, text: "Newton's method uses the derivative, giving it much faster convergence described as 'quadratic'." },
        { strength: 0, text: "Newton's method has quadratic convergence — correct digits roughly double each step." },
      ],
    },
  });

  await prisma.task.create({
    data: {
      testId: test2_1.id,
      orderIndex: 3,
      taskType: 'SINGLE_CHOICE',
      statement: 'For the Bisection Method to be applicable on [a, b], which condition is required?',
      options: [
        { id: 'a', text: 'f(a) = f(b)' },
        { id: 'b', text: 'f(a) · f(b) < 0' },
        { id: 'c', text: 'f(a) · f(b) > 0' },
        { id: 'd', text: 'f is differentiable on [a, b]' },
      ],
      correctAnswer: 'b',
      maxScore: 1,
      explanation: 'f(a) and f(b) must have opposite signs (f(a)·f(b) < 0). By the Intermediate Value Theorem, a continuous function that changes sign must cross zero somewhere in the interval.',
      hints: [
        { strength: 100, text: 'For a root to lie between a and b, f must cross zero — what must the signs of f(a) and f(b) be?' },
        { strength: 50, text: 'The IVT guarantees a root when f changes sign. Opposite signs means one is positive and one negative.' },
        { strength: 0, text: 'f(a) · f(b) < 0 — the function values at the endpoints must have opposite signs.' },
      ],
    },
  });

  const lesson2_2 = await prisma.lesson.create({
    data: {
      courseId: course2.id,
      prerequisiteId: lesson2_1.id,
      title: 'Numerical Integration',
      orderIndex: 2,
      isMandatory: true,
      estimatedMinutes: 30,
      content: [
        { type: 'text', value: 'Numerical integration approximates a definite integral when an analytical solution is impractical.' },
        { type: 'latex', value: '\\int_a^b f(x)\\,dx \\approx \\frac{h}{2}\\bigl[f(a) + 2\\textstyle\\sum_{i=1}^{n-1}f(x_i) + f(b)\\bigr]' },
        { type: 'text', value: "The Trapezoid Rule approximates the integrand with straight lines (O(h²) error). Simpson's Rule uses quadratics (O(h⁴) error)." },
      ],
    },
  });

  const test2_2 = await prisma.test.create({
    data: {
      lessonId: lesson2_2.id,
      title: 'Numerical Integration Quiz',
      timeLimitMin: 15,
      maxAttempts: 3,
      passingScore: 60,
    },
  });

  await prisma.task.create({
    data: {
      testId: test2_2.id,
      orderIndex: 1,
      taskType: 'OPEN_ANSWER',
      statement: 'Apply the Trapezoid Rule with n = 1 to f(x) = x² on [0, 2]. What is the result?',
      correctAnswer: '4',
      answerTolerance: 0.01,
      maxScore: 2,
      explanation: 'h = 2 − 0 = 2. Result = (h/2)[f(0) + f(2)] = (2/2)[0 + 4] = 4. (The exact integral is 8/3 ≈ 2.667, so one trapezoid is a rough estimate.)',
      hints: [
        { strength: 100, text: 'Trapezoid rule with n=1: result = (h/2)[f(a) + f(b)]. Here h = b − a = 2, f(0) = 0, f(2) = 4.' },
        { strength: 50, text: 'h = 2, so (2/2) = 1. Multiply by [f(0) + f(2)] = [0 + 4].' },
        { strength: 0, text: '1 × (0 + 4) = 4.' },
      ],
    },
  });

  await prisma.task.create({
    data: {
      testId: test2_2.id,
      orderIndex: 2,
      taskType: 'SINGLE_CHOICE',
      statement: 'Which integration rule generally achieves higher accuracy for the same number of sub-intervals?',
      options: [
        { id: 'a', text: 'Left Riemann Sum' },
        { id: 'b', text: 'Right Riemann Sum' },
        { id: 'c', text: 'Trapezoid Rule' },
        { id: 'd', text: "Simpson's Rule" },
      ],
      correctAnswer: 'd',
      maxScore: 1,
      explanation: "Simpson's Rule fits a parabola through three points per sub-interval, achieving O(h⁴) error vs O(h²) for the Trapezoid Rule.",
      hints: [
        { strength: 100, text: "Compare error orders: O(h²) vs O(h⁴). Which rule uses parabolas instead of straight lines?" },
        { strength: 50, text: "Simpson's Rule requires an even number of sub-intervals and uses quadratic polynomials — this gives it much lower error." },
        { strength: 0, text: "Simpson's Rule has O(h⁴) accuracy, superior to the Trapezoid Rule's O(h²)." },
      ],
    },
  });

  console.log('✔  Course 2 (Numerical Methods) created');

  // ─────────────────────────────────────────────────────────────
  // COURSE 3 — Optimization Methods (INTERMEDIATE)
  // ─────────────────────────────────────────────────────────────
  const course3 = await prisma.course.create({
    data: {
      authorId: admin.id,
      title: 'Optimization Methods',
      description:
        'Understand linear programming, the simplex method, and gradient-based optimization techniques.',
      discipline: 'Optimization',
      difficulty: 'INTERMEDIATE',
      status: 'PUBLISHED',
      isVisible: true,
      coverImageUrl: imgCourseOpt,
    },
  });

  const lesson3_1 = await prisma.lesson.create({
    data: {
      courseId: course3.id,
      title: 'Introduction to Linear Programming',
      orderIndex: 1,
      isMandatory: true,
      estimatedMinutes: 35,
      content: [
        { type: 'text', value: 'Linear programming (LP) optimizes a linear objective function subject to a system of linear inequality constraints.' },
        { type: 'latex', value: '\\max \\; c^\\top x \\quad \\text{s.t.} \\quad Ax \\leq b,\\; x \\geq 0' },
        { type: 'text', value: 'The feasible region is a convex polytope. If an optimal solution exists, it occurs at one of its vertices (corner points).' },
      ],
    },
  });

  const test3_1 = await prisma.test.create({
    data: {
      lessonId: lesson3_1.id,
      title: 'Linear Programming Basics',
      timeLimitMin: 20,
      maxAttempts: 3,
      passingScore: 60,
    },
  });

  await prisma.task.create({
    data: {
      testId: test3_1.id,
      orderIndex: 1,
      taskType: 'SINGLE_CHOICE',
      statement: 'In a linear program, what is the objective function?',
      options: [
        { id: 'a', text: 'A set of inequalities limiting the decision variables' },
        { id: 'b', text: 'The linear function being maximized or minimized' },
        { id: 'c', text: 'The set of all feasible solutions' },
        { id: 'd', text: 'A non-linear function of the decision variables' },
      ],
      correctAnswer: 'b',
      maxScore: 1,
      explanation: 'The objective function is the linear expression you want to optimize (e.g. maximise profit). The constraints define the feasible region.',
      hints: [
        { strength: 100, text: "In an optimization problem there's a 'goal' — a function you want to make as large (or small) as possible. What is that called?" },
        { strength: 50, text: "It's not the constraints. It's the function you're actually optimizing — the 'object' of the optimization." },
        { strength: 0, text: 'The objective function is the linear function being maximized or minimized.' },
      ],
    },
  });

  await prisma.task.create({
    data: {
      testId: test3_1.id,
      orderIndex: 2,
      taskType: 'MULTIPLE_CHOICE',
      statement: 'Which statements about the feasible region of an LP are correct? (Select all that apply)',
      options: [
        { id: 'a', text: 'It is always a convex set' },
        { id: 'b', text: 'It can be empty (infeasible LP)' },
        { id: 'c', text: 'It is always bounded' },
        { id: 'd', text: 'If an optimum exists, it lies at a vertex' },
      ],
      correctAnswer: JSON.stringify(['a', 'b', 'd']),
      maxScore: 2,
      explanation: 'The feasible region is always convex (intersection of half-planes). It may be empty (no solution) or unbounded. When an optimum exists, it occurs at a vertex.',
      hints: [
        { strength: 100, text: 'The feasible region is the intersection of linear half-planes. Is that always convex? Always bounded? Can it be empty?' },
        { strength: 50, text: 'Three of the four are correct. Convex: yes (intersection of half-planes). Empty: yes (contradictory constraints). Always bounded: no. Vertex optimum: yes.' },
        { strength: 0, text: 'Correct: convex, can be empty, optimum at vertex. Incorrect: it is NOT always bounded.' },
      ],
    },
  });

  await prisma.task.create({
    data: {
      testId: test3_1.id,
      orderIndex: 3,
      taskType: 'OPEN_ANSWER',
      statement: 'Maximise z = 3x + 2y subject to x + y ≤ 4, x ≥ 0, y ≥ 0. What is the maximum value of z?',
      correctAnswer: '12',
      answerTolerance: 0,
      maxScore: 2,
      explanation: 'Corner points: (0,0)→z=0, (4,0)→z=12, (0,4)→z=8. Maximum is z = 12 at (4, 0).',
      hints: [
        { strength: 100, text: 'Identify the corner points of the feasible region, then evaluate z = 3x + 2y at each one.' },
        { strength: 50, text: 'The vertices are (0,0), (4,0), and (0,4). Which gives the largest value of 3x + 2y?' },
        { strength: 0, text: 'z(4, 0) = 3×4 + 2×0 = 12 is the maximum.' },
      ],
    },
  });

  const lesson3_2 = await prisma.lesson.create({
    data: {
      courseId: course3.id,
      prerequisiteId: lesson3_1.id,
      title: 'Gradient Descent',
      orderIndex: 2,
      isMandatory: false,
      estimatedMinutes: 30,
      content: [
        { type: 'text', value: 'Gradient descent minimizes a differentiable function by iteratively stepping in the direction of steepest descent.' },
        { type: 'latex', value: 'x_{n+1} = x_n - \\alpha \\nabla f(x_n)' },
        { type: 'text', value: 'The learning rate α controls the step size. Too large: diverges. Too small: slow convergence.' },
      ],
    },
  });

  const test3_2 = await prisma.test.create({
    data: {
      lessonId: lesson3_2.id,
      title: 'Gradient Descent Quiz',
      timeLimitMin: 15,
      maxAttempts: 3,
      passingScore: 60,
    },
  });

  await prisma.task.create({
    data: {
      testId: test3_2.id,
      orderIndex: 1,
      taskType: 'SINGLE_CHOICE',
      statement: 'In gradient descent, what does the learning rate α control?',
      options: [
        { id: 'a', text: 'The direction of each update step' },
        { id: 'b', text: 'The size of each update step' },
        { id: 'c', text: 'The number of iterations' },
        { id: 'd', text: 'The value of the function at the minimum' },
      ],
      correctAnswer: 'b',
      maxScore: 1,
      explanation: 'α scales the gradient to determine how far to move each step. The gradient provides the direction; α provides the magnitude.',
      hints: [
        { strength: 100, text: 'Look at the update rule: x = x − α∇f(x). α is multiplied by the gradient — what does multiplying change?' },
        { strength: 50, text: 'The gradient gives direction. α is a scalar multiplier — it scales the magnitude of the step.' },
        { strength: 0, text: 'α controls the step size (magnitude) of each update.' },
      ],
    },
  });

  await prisma.task.create({
    data: {
      testId: test3_2.id,
      orderIndex: 2,
      taskType: 'OPEN_ANSWER',
      statement: 'Starting at x = 4, apply one step of gradient descent to f(x) = x² with α = 0.1. What is the new x?',
      correctAnswer: '3.2',
      answerTolerance: 0.001,
      maxScore: 2,
      explanation: "f'(x) = 2x = 8 at x=4. New x = 4 − 0.1 × 8 = 4 − 0.8 = 3.2.",
      hints: [
        { strength: 100, text: "Compute f'(x) = 2x at x = 4, then apply: x_new = x − α × f'(x)." },
        { strength: 50, text: "f'(4) = 2×4 = 8. x_new = 4 − 0.1 × 8." },
        { strength: 0, text: '4 − 0.1 × 8 = 4 − 0.8 = 3.2.' },
      ],
    },
  });

  console.log('✔  Course 3 (Optimization) created');

  // ─────────────────────────────────────────────────────────────
  // Alice's submissions — course 1 fully completed
  // ─────────────────────────────────────────────────────────────

  // Test 1-1: passed on first try (4/4)
  const tasks1_1 = await prisma.task.findMany({
    where: { testId: test1_1.id },
    orderBy: { orderIndex: 'asc' },
  });

  await prisma.testSubmission.create({
    data: {
      userId: alice.id,
      testId: test1_1.id,
      attemptNumber: 1,
      status: 'GRADED',
      totalScore: 4,
      maxScore: 4,
      percentScore: 100,
      passed: true,
      timeSpentMs: 240_000,
      answers: [
        { taskId: tasks1_1[0].id, userAnswer: { selected: 'b' },              isCorrect: true,  score: 1 },
        { taskId: tasks1_1[1].id, userAnswer: { selected: ['a', 'b', 'd'] },  isCorrect: true,  score: 2 },
        { taskId: tasks1_1[2].id, userAnswer: { text: '6' },                  isCorrect: true,  score: 1 },
      ],
    },
  });

  // Test 1-2: failed first attempt, passed second
  const tasks1_2 = await prisma.task.findMany({
    where: { testId: test1_2.id },
    orderBy: { orderIndex: 'asc' },
  });

  await prisma.testSubmission.create({
    data: {
      userId: alice.id,
      testId: test1_2.id,
      attemptNumber: 1,
      status: 'GRADED',
      totalScore: 0,
      maxScore: 3,
      percentScore: 0,
      passed: false,
      timeSpentMs: 185_000,
      answers: [
        { taskId: tasks1_2[0].id, userAnswer: { selected: 'a' },  isCorrect: false, score: 0 },
        { taskId: tasks1_2[1].id, userAnswer: { text: '3' },       isCorrect: false, score: 0 },
        { taskId: tasks1_2[2].id, userAnswer: { selected: 'c' },  isCorrect: false, score: 0 },
      ],
    },
  });

  await prisma.testSubmission.create({
    data: {
      userId: alice.id,
      testId: test1_2.id,
      attemptNumber: 2,
      status: 'GRADED',
      totalScore: 3,
      maxScore: 3,
      percentScore: 100,
      passed: true,
      timeSpentMs: 200_000,
      answers: [
        { taskId: tasks1_2[0].id, userAnswer: { selected: 'b' },  isCorrect: true,  score: 1 },
        { taskId: tasks1_2[1].id, userAnswer: { text: '2' },       isCorrect: true,  score: 1 },
        { taskId: tasks1_2[2].id, userAnswer: { selected: 'b' },  isCorrect: true,  score: 1 },
      ],
    },
  });

  // Test 1-3: passed (3/3)
  const tasks1_3 = await prisma.task.findMany({
    where: { testId: test1_3.id },
    orderBy: { orderIndex: 'asc' },
  });

  await prisma.testSubmission.create({
    data: {
      userId: alice.id,
      testId: test1_3.id,
      attemptNumber: 1,
      status: 'GRADED',
      totalScore: 3,
      maxScore: 3,
      percentScore: 100,
      passed: true,
      timeSpentMs: 310_000,
      answers: [
        { taskId: tasks1_3[0].id, userAnswer: { text: '7' },       isCorrect: true,  score: 2 },
        { taskId: tasks1_3[1].id, userAnswer: { selected: 'b' },  isCorrect: true,  score: 1 },
      ],
    },
  });

  await prisma.userProgress.create({
    data: {
      userId: alice.id,
      courseId: course1.id,
      progressPercent: 100,
      totalScore: 10, // 4 + 0 + 3 + 3 = 10 across all attempts
    },
  });

  // Alice partially into course 2 (one test done, not passed yet)
  const tasks2_1 = await prisma.task.findMany({
    where: { testId: test2_1.id },
    orderBy: { orderIndex: 'asc' },
  });

  await prisma.testSubmission.create({
    data: {
      userId: alice.id,
      testId: test2_1.id,
      attemptNumber: 1,
      status: 'GRADED',
      totalScore: 1,
      maxScore: 3,
      percentScore: 33.33,
      passed: false,
      timeSpentMs: 220_000,
      answers: [
        { taskId: tasks2_1[0].id, userAnswer: { text: '1.5' },     isCorrect: true,  score: 1 },
        { taskId: tasks2_1[1].id, userAnswer: { selected: 'a' },   isCorrect: false, score: 0 },
        { taskId: tasks2_1[2].id, userAnswer: { selected: 'c' },   isCorrect: false, score: 0 },
      ],
    },
  });

  await prisma.userProgress.create({
    data: {
      userId: alice.id,
      courseId: course2.id,
      progressPercent: 0,
      totalScore: 1,
    },
  });

  console.log('✔  Alice\'s submissions and progress created');

  // ── Achievements ─────────────────────────────────────────────
  await prisma.achievement.create({
    data: {
      userId: alice.id,
      code: 'FIRST_PASS',
      name: 'First Step',
      description: 'Passed your first test.',
      category: 'PROGRESS',
      pointsAwarded: 10,
      iconUrl: imgAchFirst,
    },
  });
  await prisma.achievement.create({
    data: {
      userId: alice.id,
      code: 'PERFECT_SCORE',
      name: 'Perfectionist',
      description: 'Scored 100% on a test.',
      category: 'SKILL',
      pointsAwarded: 25,
      iconUrl: imgAchPerfect,
    },
  });
  await prisma.achievement.create({
    data: {
      userId: alice.id,
      code: 'COMEBACK',
      name: 'Comeback',
      description: 'Failed a test then passed it on a later attempt.',
      category: 'STREAK',
      pointsAwarded: 15,
      iconUrl: imgAchComeback,
    },
  });

  console.log('✔  Achievements created');

  console.log('\n✅  Seed complete.\n');
  console.log('  Role     Email                       Password');
  console.log('  ──────── ─────────────────────────── ────────');
  console.log('  ADMIN    admin@optilearn.dev          Dev123!');
  console.log('  STUDENT  alice@optilearn.dev          Dev123!  (has progress)');
  console.log('  STUDENT  bob@optilearn.dev            Dev123!  (fresh account)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
