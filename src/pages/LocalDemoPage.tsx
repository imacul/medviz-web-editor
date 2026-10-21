import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';

// Reuse the actual MedViz mesh editor; only cloud persistence is omitted.
const Medical3DCanvas = lazy(() => import('../Medical3DCanvas.jsx'));

type Point = readonly [number, number, number];

const DEMO_PROFILE: ReadonlyArray<readonly [number, number]> = [
  [-18, 0.5],
  [-16, 2.3],
  [-13, 3.0],
  [-9, 3.7],
  [-5, 5.0],
  [-2, 7.2],
  [1, 9.2],
  [4, 10.1],
  [7, 10.6],
  [10, 10.2],
  [12, 8.4],
  [14, 6.5],
  [16, 3.0],
  [17, 0.5],
];

/**
 * A small synthetic mesh (not patient or anatomical data) so a fresh clone
 * has something to measure, annotate, slice, and export without a backend.
 */
function createSampleMeshFile(): File {
  const sections = 64;
  const facets: string[] = ['solid medviz-synthetic-demo'];

  const position = (height: number, radius: number, index: number): Point => {
    const theta = (index / sections) * Math.PI * 2;
    const wave = 1 + 0.07 * Math.cos(theta * 4) + 0.025 * Math.sin(theta * 7);
    return [
      Math.cos(theta) * radius * wave,
      height,
      Math.sin(theta) * radius * wave,
    ];
  };

  const triangle = (a: Point, b: Point, c: Point) => {
    const ab: Point = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const ac: Point = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const nx = ab[1] * ac[2] - ab[2] * ac[1];
    const ny = ab[2] * ac[0] - ab[0] * ac[2];
    const nz = ab[0] * ac[1] - ab[1] * ac[0];
    const length = Math.hypot(nx, ny, nz) || 1;
    facets.push(
      `facet normal ${nx / length} ${ny / length} ${nz / length}\n` +
        'outer loop\n' +
        `vertex ${a.join(' ')}\nvertex ${b.join(' ')}\nvertex ${c.join(' ')}\n` +
        'endloop\nendfacet'
    );
  };

  for (let i = 0; i < DEMO_PROFILE.length - 1; i += 1) {
    const [lowY, lowRadius] = DEMO_PROFILE[i];
    const [highY, highRadius] = DEMO_PROFILE[i + 1];
    for (let segment = 0; segment < sections; segment += 1) {
      const a = position(lowY, lowRadius, segment);
      const b = position(lowY, lowRadius, segment + 1);
      const c = position(highY, highRadius, segment);
      const d = position(highY, highRadius, segment + 1);
      triangle(a, c, b);
      triangle(b, c, d);
    }
  }

  const [bottomY, bottomRadius] = DEMO_PROFILE[0];
  const [topY, topRadius] = DEMO_PROFILE[DEMO_PROFILE.length - 1];
  for (let segment = 0; segment < sections; segment += 1) {
    triangle([0, bottomY, 0], position(bottomY, bottomRadius, segment), position(bottomY, bottomRadius, segment + 1));
    triangle([0, topY, 0], position(topY, topRadius, segment + 1), position(topY, topRadius, segment));
  }

  facets.push('endsolid medviz-synthetic-demo');
  return new File([facets.join('\n')], 'medviz-sample-mesh.stl', { type: 'model/stl' });
}

export default function LocalDemoPage() {
  const navigate = useNavigate();
  const sampleModel = useMemo(createSampleMeshFile, []);
  const [showIntro, setShowIntro] = useState(true);

  useEffect(() => {
    document.body.classList.add('editor-mode');
    document.title = 'MedViz — Local 3D Demo';
    return () => {
      document.body.classList.remove('editor-mode');
    };
  }, []);

  return (
    <div className="relative h-screen w-full bg-[#07111d]">
      <Suspense
        fallback={
          <div className="flex h-screen items-center justify-center text-sm text-white/80">
            Preparing the local 3D editor…
          </div>
        }
      >
        <Medical3DCanvas initialModelSource={sampleModel} onGoHome={() => navigate('/')} />
      </Suspense>
      {showIntro && (
        <aside
          role="status"
          className="fixed left-3 top-20 z-[320] w-[min(360px,calc(100vw-24px))] rounded-2xl border border-sky-300/30 bg-[#081b2eeF] p-4 text-sm text-white shadow-2xl backdrop-blur"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-bold text-sky-200">Local demo — no backend required</p>
              <p className="mt-1 leading-relaxed text-white/80">
                Rotate, measure, slice, and annotate this illustrative sample mesh.
                Use Import to open your own STL, OBJ, or PLY file.
              </p>
              <p className="mt-2 text-xs leading-relaxed text-white/60">
                This sample is synthetic, not clinical anatomy. Cloud saves, shared links,
                and team comments require your own Supabase configuration.
              </p>
              <Link to="/" className="mt-2 inline-block text-xs font-semibold text-sky-200 underline">
                Back to MedViz
              </Link>
            </div>
            <button
              type="button"
              aria-label="Dismiss local demo instructions"
              onClick={() => setShowIntro(false)}
              className="rounded-lg p-1 text-lg leading-none text-white/70 hover:bg-white/10 hover:text-white"
            >
              ×
            </button>
          </div>
        </aside>
      )}
    </div>
  );
}
