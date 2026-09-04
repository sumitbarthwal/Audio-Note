import { DocumentItem } from '../types';
import { parseRawText, estimateAudioDuration } from './fileParsers';

export const SAMPLE_DOCUMENTS: DocumentItem[] = [
  (() => {
    const text = `# The Time Machine
by H. G. Wells

The Time Traveller (for so it will be convenient to speak of him) was expounding a recondite matter to us. His grey eyes shone and twinkled, and his usually pale face was flushed and animated. The fire burnt brightly, and the soft radiance of the incandescent lights in the lilies of silver caught the bubbles that flashed and passed in our glasses.

"You must follow me carefully. I shall have to controvert one or two ideas that are almost universally accepted. The geometry, for instance, they taught you at school is founded on a misconception."

"Is not that rather a large thing to expect us to begin upon?" said Filby, an argumentative person with red hair.

"I do not mean to ask you to accept anything without reasonable ground for it. You will soon admit as much as I need from you. You know of course that a mathematical line, a line of thickness nil, has no real existence. They taught you that? Neither has a mathematical plane. These things are mere abstractions."

"That is all right," said the Psychologist.

"Nor, having only length, breadth, and thickness, can a cube have a real existence."

"There I object," said Filby. "Of course a solid body may exist. All real things—"

"So most people think. But wait a moment. Can an instantaneous cube exist?"

"Don't follow you," said Filby.

"Can a cube that does not exist for any time at all, have a real existence?"

Filby became pensive. "Clearly," the Time Traveller proceeded, "any real body must have extension in four directions: it must have Length, Breadth, Thickness, and Duration. But through a natural infirmity of the flesh, we incline to overlook this fact. There are really four dimensions, three which we call the three planes of Space, and a fourth, Time."`;

    const parsed = parseRawText(text, 'The Time Machine — H.G. Wells', 'txt');
    return {
      id: 'sample_time_machine',
      title: parsed.title,
      fileType: 'txt',
      fileSize: text.length,
      createdAt: Date.now() - 3600000 * 24,
      updatedAt: Date.now() - 3600000 * 24,
      totalWords: parsed.totalWords,
      estimatedDurationSeconds: estimateAudioDuration(parsed.totalWords, 1.0),
      sections: parsed.sections,
      currentSectionIndex: 0,
      currentWordOffset: 0,
      completedPercent: 0,
      bookmarks: [],
    };
  })(),

  (() => {
    const text = `# Self-Reliance
by Ralph Waldo Emerson

There is a time in every man's education when he arrives at the conviction that envy is ignorance; that imitation is suicide; that he must take himself for better, for worse, as his portion; that though the wide universe is full of good, no kernel of nourishing corn can come to him but through his toil bestowed on that plot of ground which is given to him to till. The power which resides in him is new in nature, and none but he knows what that is which he can do, nor does he know until he has tried.

Trust thyself: every heart vibrates to that iron string. Accept the place the divine providence has found for you, the society of your contemporaries, the connection of events. Great men have always done so, and confided themselves childlike to the genius of their age, betraying their perception that the absolutely trustworthy was seated at their heart, working through their hands, predominating in all their being.

Whoso would be a man must be a nonconformist. He who would gather immortal palms must not be hindered by the name of goodness, but must explore if it be goodness. Nothing is at last sacred but the integrity of your own mind. Absolve you to yourself, and you shall have the suffrage of the world.

A foolish consistency is the hobgoblin of little minds, adored by little statesmen and philosophers and divines. With consistency a great soul has simply nothing to do. He may as well concern himself with his shadow on the wall. Speak what you think now in hard words, and tomorrow speak what tomorrow thinks in hard words again, though it contradict every thing you said today.`;

    const parsed = parseRawText(text, 'Self-Reliance — Ralph Waldo Emerson', 'md');
    return {
      id: 'sample_self_reliance',
      title: parsed.title,
      fileType: 'md',
      fileSize: text.length,
      createdAt: Date.now() - 3600000 * 48,
      updatedAt: Date.now() - 3600000 * 48,
      totalWords: parsed.totalWords,
      estimatedDurationSeconds: estimateAudioDuration(parsed.totalWords, 1.0),
      sections: parsed.sections,
      currentSectionIndex: 0,
      currentWordOffset: 0,
      completedPercent: 0,
      bookmarks: [],
    };
  })(),

  (() => {
    const text = `# The Art of War: Laying Plans
by Sun Tzu

Sun Tzu said: The art of war is of vital importance to the State. It is a matter of life and death, a road either to safety or to ruin. Hence it is a subject of inquiry which can on no account be neglected.

The art of war, then, is governed by five constant factors, to be taken into account in one's deliberations, when seeking to determine the conditions obtaining in the field. These are: The Moral Law; Heaven; Earth; The Commander; Method and discipline.

The Moral Law causes the people to be in complete accord with their ruler, so that they will follow him regardless of their lives, undismayed by any danger.

Heaven signifies night and day, cold and heat, times and seasons. Earth comprises distances, great and small; danger and security; open ground and narrow passes; the chances of life and death.

The Commander stands for the virtues of wisdom, sincerely, benevolence, strictness, and courage.

Method and discipline are to be understood the marshaling of the army in its proper subdivisions, the graduations of rank among the officers, the maintenance of roads by which supplies may reach the army, and the control of military expenditure.

These five heads should be familiar to every general: he who knows them will be victorious; he who knows them not will fail.`;

    const parsed = parseRawText(text, 'The Art of War — Sun Tzu', 'txt');
    return {
      id: 'sample_art_of_war',
      title: parsed.title,
      fileType: 'txt',
      fileSize: text.length,
      createdAt: Date.now() - 3600000 * 72,
      updatedAt: Date.now() - 3600000 * 72,
      totalWords: parsed.totalWords,
      estimatedDurationSeconds: estimateAudioDuration(parsed.totalWords, 1.0),
      sections: parsed.sections,
      currentSectionIndex: 0,
      currentWordOffset: 0,
      completedPercent: 0,
      bookmarks: [],
    };
  })(),

  (() => {
    const text = `# Executive Strategy Briefing
Confidential Operations Memorandum

# Section 1: Strategic Principles
In volatile environments, clear operational principles outperform rigid planning. Teams must cultivate high agency, disciplined execution, and rapid learning loops. When unexpected obstacles arise, immediate adjustment based on ground reality preserves momentum.

# Section 2: Deep Work & Focus Allocation
High-leverage outcomes require uninterrupted blocks of cognitive focus. Distractions must be minimized through clear communication protocols, batch processing of asynchronous updates, and dedicated thinking time for complex system architecture.

# Section 3: Summary and Action Items
Review quarterly deliverables by Friday afternoon. Ensure all offline materials and core documentation are validated across target devices before final sign-off.`;

    const parsed = parseRawText(text, 'Executive Strategy Briefing (Word Document)', 'txt');
    return {
      id: 'sample_word_briefing',
      title: 'Executive Strategy Briefing (Word Document)',
      fileType: 'docx' as const,
      fileSize: text.length * 2,
      createdAt: Date.now() - 3600000 * 12,
      updatedAt: Date.now() - 3600000 * 12,
      totalWords: parsed.totalWords,
      estimatedDurationSeconds: estimateAudioDuration(parsed.totalWords, 1.0),
      sections: parsed.sections,
      currentSectionIndex: 0,
      currentWordOffset: 0,
      completedPercent: 0,
      bookmarks: [],
    };
  })(),

  (() => {
    const text = `# Laboratory Field Report & Specimen Scan
Optical Character Recognition Extract

# Part 1: Initial Observations
Environmental sensors recorded ambient temperatures between 18 and 22 degrees Celsius across three collection stations. Soil moisture levels remained steady throughout the dawn cycle, promoting baseline microbial activity.

# Part 2: Chemical & Spectroscopic Data
Spectroscopic analysis of crystalline samples revealed elevated silica concentrations consistent with quartz-veined bedrock. No hazardous volatile organic compounds were detected within the active observation perimeter.

# Part 3: Protocol Recommendations
Continue passive telemetry recording over the next 48 hours. Archive all field photographs and raw spectroscopic scans locally for subsequent multi-spectral verification.`;

    const parsed = parseRawText(text, 'Field Research & Laboratory Notes (OCR Scan)', 'txt');
    return {
      id: 'sample_ocr_report',
      title: 'Field Research & Laboratory Notes (OCR Scan)',
      fileType: 'image' as const,
      fileSize: 42000,
      createdAt: Date.now() - 3600000 * 4,
      updatedAt: Date.now() - 3600000 * 4,
      totalWords: parsed.totalWords,
      estimatedDurationSeconds: estimateAudioDuration(parsed.totalWords, 1.0),
      sections: parsed.sections,
      currentSectionIndex: 0,
      currentWordOffset: 0,
      completedPercent: 0,
      bookmarks: [],
    };
  })(),
];
