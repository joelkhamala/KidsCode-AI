import { useEffect, useRef, useState } from 'react';
import { adultAPI } from '../services/api';

/**
 * Counts real study time for adult learners: once a minute, while the page is visible
 * and the learner has been active (typing, clicking, scrolling) in the last 3 minutes,
 * the server is told to add one minute. Returns the learner's total hours.
 */
const ACTIVE_WINDOW_MS = 3 * 60 * 1000;

export default function useStudyTimer({ lessonId = null, kind = 'lesson' } = {}) {
  const [hours, setHours] = useState(null);
  const lastActive = useRef(Date.now());

  useEffect(() => {
    const mark = () => { lastActive.current = Date.now(); };
    const events = ['keydown', 'mousedown', 'mousemove', 'scroll', 'touchstart', 'wheel'];
    events.forEach((e) => window.addEventListener(e, mark, { passive: true }));
    const beat = () => {
      if (document.hidden || Date.now() - lastActive.current > ACTIVE_WINDOW_MS) return;
      adultAPI.activity({ lessonId, kind }).then((r) => setHours(r.data.hoursLogged)).catch(() => {});
    };
    const timer = setInterval(beat, 60 * 1000);
    return () => {
      clearInterval(timer);
      events.forEach((e) => window.removeEventListener(e, mark));
    };
  }, [lessonId, kind]);

  return hours;
}
