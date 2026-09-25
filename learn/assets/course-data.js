// Shared course-outline loader for course.html and lesson.html.
// modules/lessons only come back non-empty when RLS allows it (enrolled
// user or admin) — an empty result for a published course means "not
// enrolled", not "no content".

function mycpParseCourseSlug() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('course')) return params.get('course');
  const parts = window.location.pathname.split('/').filter(Boolean);
  if (parts[0] === 'learn' && parts[1] && parts[1] !== 'course.html') {
    return decodeURIComponent(parts[1]);
  }
  return null;
}

function mycpParseLessonPath() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('course') && params.get('module') && params.get('lesson')) {
    return {
      course: params.get('course'),
      module: params.get('module'),
      lesson: params.get('lesson'),
    };
  }
  const parts = window.location.pathname.split('/').filter(Boolean);
  if (parts[0] === 'learn' && parts.length >= 4 && parts[1] !== 'lesson.html') {
    return {
      course: decodeURIComponent(parts[1]),
      module: decodeURIComponent(parts[2]),
      lesson: decodeURIComponent(parts[3]),
    };
  }
  return null;
}

async function mycpLoadCourseOutline(courseSlug) {
  const { data: course, error: courseErr } = await supabaseClient
    .from('courses')
    .select('id, slug, title, subtitle, description, is_published')
    .eq('slug', courseSlug)
    .maybeSingle();

  if (courseErr) console.error('mycpLoadCourseOutline: course', courseErr);
  if (!course) return { course: null };

  const session = await mycpGetSession();

  let enrolled = false;
  if (session) {
    const { data: enrolment, error: enrolErr } = await supabaseClient
      .from('enrolments')
      .select('id')
      .eq('course_id', course.id)
      .eq('user_id', session.user.id)
      .eq('status', 'active')
      .maybeSingle();
    if (enrolErr) console.error('mycpLoadCourseOutline: enrolment', enrolErr);
    enrolled = !!enrolment;
  }

  const { data: modules, error: modulesErr } = await supabaseClient
    .from('modules')
    .select('id, slug, title, summary, sort_order, lessons(id, slug, title, body, video_url, sort_order)')
    .eq('course_id', course.id)
    .order('sort_order', { ascending: true });
  if (modulesErr) console.error('mycpLoadCourseOutline: modules', modulesErr);

  (modules || []).forEach((m) => {
    (m.lessons || []).sort((a, b) => a.sort_order - b.sort_order);
  });

  let progressLessonIds = new Set();
  const lessonIds = (modules || []).flatMap((m) => (m.lessons || []).map((l) => l.id));
  if (session && lessonIds.length) {
    const { data: progress, error: progressErr } = await supabaseClient
      .from('lesson_progress')
      .select('lesson_id')
      .eq('user_id', session.user.id)
      .in('lesson_id', lessonIds);
    if (progressErr) console.error('mycpLoadCourseOutline: progress', progressErr);
    progressLessonIds = new Set((progress || []).map((p) => p.lesson_id));
  }

  return { course, session, enrolled, modules: modules || [], progressLessonIds };
}

function mycpFlattenLessons(modules) {
  const flat = [];
  modules.forEach((m) => {
    (m.lessons || []).forEach((l) => {
      flat.push({ ...l, moduleSlug: m.slug, moduleTitle: m.title });
    });
  });
  return flat;
}

function mycpLessonUrl(courseSlug, moduleSlug, lessonSlug) {
  return `/learn/${courseSlug}/${moduleSlug}/${lessonSlug}`;
}
