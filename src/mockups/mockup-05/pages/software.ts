/* HPC Console — Software & Modules (stage 1: catalogue)
 * Mock dataset describing applications installed on the cluster together
 * with their environment-module records. Version counts in derived helpers
 * always come from the `versions` array so metadata can never contradict.
 * Everything is frozen to the shared FROZEN timestamp like other datasets. */

import { DAY, FROZEN } from '../data'

export type SoftwareCategory =
  | 'Programming Languages' | 'Compilers' | 'MPI' | 'GPU Computing'
  | 'Machine Learning' | 'Scientific Computing' | 'Statistics'
  | 'Bioinformatics' | 'Molecular Dynamics' | 'CFD' | 'Engineering'
  | 'Libraries' | 'Containers' | 'Data Processing'

export type ModuleSystem = 'Lmod' | 'Environment Modules'
export type Availability = 'available' | 'restricted' | 'unavailable'

export interface SoftwareApp {
  id: string
  name: string
  description: string
  category: SoftwareCategory
  defaultVersion: string
  moduleSystem: ModuleSystem
  availability: Availability
  /** Epoch ms relative to the shared FROZEN timestamp. */
  lastUpdatedMs: number
  versions: Array<{ version: string; module: string }>
}

const daysAgo = (d: number): number => FROZEN - d * DAY

export const SOFTWARE: SoftwareApp[] = [
  {
    id: 'python', name: 'Python', description: 'CPython interpreter with scientific stack preinstalled.',
    category: 'Programming Languages', defaultVersion: '3.12.3', moduleSystem: 'Lmod',
    availability: 'available', lastUpdatedMs: daysAgo(3),
    versions: [
      { version: '3.12.3', module: 'python/3.12.3' },
      { version: '3.11.9', module: 'python/3.11.9' },
      { version: '3.10.14', module: 'python/3.10.14' },
      { version: '2.7.18', module: 'python/2.7.18 (legacy)' },
    ],
  },
  {
    id: 'gcc', name: 'GCC', description: 'GNU Compiler Collection — C, C++ and Fortran toolchains.',
    category: 'Compilers', defaultVersion: '13.2.0', moduleSystem: 'Lmod',
    availability: 'available', lastUpdatedMs: daysAgo(9),
    versions: [
      { version: '13.2.0', module: 'gcc/13.2.0' },
      { version: '12.3.0', module: 'gcc/12.3.0' },
      { version: '11.4.0', module: 'gcc/11.4.0' },
    ],
  },
  {
    id: 'openmpi', name: 'OpenMPI', description: 'Message Passing Interface runtime for distributed workloads.',
    category: 'MPI', defaultVersion: '4.1.6', moduleSystem: 'Lmod',
    availability: 'available', lastUpdatedMs: daysAgo(6),
    versions: [
      { version: '4.1.6', module: 'openmpi/4.1.6-gcc-13.2.0' },
      { version: '4.1.4', module: 'openmpi/4.1.4-gcc-12.3.0' },
      { version: '4.1.2', module: 'openmpi/4.1.2-gcc-11.4.0' },
    ],
  },
  {
    id: 'cuda', name: 'CUDA', description: 'NVIDIA CUDA Toolkit — libraries and nvcc compiler.',
    category: 'GPU Computing', defaultVersion: '12.4', moduleSystem: 'Lmod',
    availability: 'available', lastUpdatedMs: daysAgo(5),
    versions: [
      { version: '12.4.1', module: 'cuda/12.4.1' },
      { version: '12.2.2', module: 'cuda/12.2.2' },
      { version: '11.8.0', module: 'cuda/11.8.0' },
    ],
  },
  {
    id: 'pytorch', name: 'PyTorch', description: 'Deep-learning framework with CUDA-enabled builds.',
    category: 'Machine Learning', defaultVersion: '2.3.1', moduleSystem: 'Lmod',
    availability: 'available', lastUpdatedMs: daysAgo(4),
    versions: [
      { version: '2.3.1', module: 'PyTorch/2.3.1-foss-2024a-CUDA-12.4.0' },
      { version: '2.2.2', module: 'PyTorch/2.2.2-foss-2023b-CUDA-12.2.2' },
      { version: '2.1.2', module: 'PyTorch/2.1.2-foss-2023a' },
    ],
  },
  {
    id: 'tensorflow', name: 'TensorFlow', description: 'End-to-end machine-learning platform from Google.',
    category: 'Machine Learning', defaultVersion: '2.16.1', moduleSystem: 'Environment Modules',
    availability: 'available', lastUpdatedMs: daysAgo(11),
    versions: [
      { version: '2.16.1', module: 'tensorflow/2.16.1' },
      { version: '2.15.0', module: 'tensorflow/2.15.0' },
    ],
  },
  {
    id: 'r', name: 'R', description: 'Statistics environment with Bioconductor mirrors.',
    category: 'Statistics', defaultVersion: '4.4.1', moduleSystem: 'Lmod',
    availability: 'available', lastUpdatedMs: daysAgo(8),
    versions: [
      { version: '4.4.1', module: 'r/4.4.1' },
      { version: '4.3.3', module: 'r/4.3.3' },
      { version: '4.2.2', module: 'r/4.2.2' },
    ],
  },
  {
    id: 'julia', name: 'Julia', description: 'High-performance numerical programming language.',
    category: 'Programming Languages', defaultVersion: '1.10.4', moduleSystem: 'Lmod',
    availability: 'available', lastUpdatedMs: daysAgo(14),
    versions: [
      { version: '1.10.4', module: 'julia/1.10.4' },
      { version: '1.9.4', module: 'julia/1.9.4' },
    ],
  },
  {
    id: 'gromacs', name: 'GROMACS', description: 'Molecular-dynamics simulation package optimised for GPUs.',
    category: 'Molecular Dynamics', defaultVersion: '2024.2', moduleSystem: 'Lmod',
    availability: 'available', lastUpdatedMs: daysAgo(7),
    versions: [
      { version: '2024.2', module: 'gromacs/2024.2-plumed-CUDA-12.4.0' },
      { version: '2023.4', module: 'gromacs/2023.4-CUDA-12.2.2' },
    ],
  },
  {
    id: 'openfoam', name: 'OpenFOAM', description: 'Open-source CFD toolbox for continuum mechanics.',
    category: 'CFD', defaultVersion: 'v2312', moduleSystem: 'Environment Modules',
    availability: 'available', lastUpdatedMs: daysAgo(16),
    versions: [
      { version: 'v2312', module: 'openfoam/v2312' },
      { version: 'v2012', module: 'openfoam/v2012' },
    ],
  },
  {
    id: 'lammps', name: 'LAMMPS', description: 'Large-scale atomic/molecular massively parallel simulator.',
    category: 'Molecular Dynamics', defaultVersion: '2 Aug 2023', moduleSystem: 'Lmod',
    availability: 'available', lastUpdatedMs: daysAgo(21),
    versions: [
      { version: '2 Aug 2023', module: 'lammps/2023.08.02-CUDA-12.2.2' },
      { version: '29 Mar 2023', module: 'lammps/2023.03.29' },
    ],
  },
  {
    id: 'matlab', name: 'MATLAB', description: 'Numerical computing environment (licenced, per-seat).',
    category: 'Engineering', defaultVersion: 'R2024a', moduleSystem: 'Lmod',
    availability: 'restricted', lastUpdatedMs: daysAgo(18),
    versions: [
      { version: 'R2024a', module: 'matlab/R2024a' },
      { version: 'R2023b', module: 'matlab/R2023b' },
    ],
  },
  {
    id: 'ansys-fluent', name: 'Ansys Fluent', description: 'Commercial CFD solver (licenced, contact HPC support).',
    category: 'Engineering', defaultVersion: '2024 R1', moduleSystem: 'Lmod',
    availability: 'restricted', lastUpdatedMs: daysAgo(26),
    versions: [
      { version: '2024 R1', module: 'ansys/2024R1' },
      { version: '2023 R2', module: 'ansys/2023R2' },
    ],
  },
  {
    id: 'singularity-ce', name: 'SingularityCE', description: 'Container runtime for HPC (legacy maintenance branch).',
    category: 'Containers', defaultVersion: '3.8.7', moduleSystem: 'Environment Modules',
    availability: 'unavailable', lastUpdatedMs: daysAgo(96),
    versions: [
      { version: '3.8.7', module: 'singularity/3.8.7' },
      { version: '3.8.5', module: 'singularity/3.8.5' },
    ],
  },
  {
    id: 'apptainer', name: 'Apptainer', description: 'Successor to Singularity — container platform for HPC.',
    category: 'Containers', defaultVersion: '1.1.5', moduleSystem: 'Lmod',
    availability: 'available', lastUpdatedMs: daysAgo(12),
    versions: [
      { version: '1.1.5', module: 'apptainer/1.1.5' },
      { version: '1.1.3', module: 'apptainer/1.1.3' },
    ],
  },
  {
    id: 'hdf5', name: 'HDF5', description: 'Hierarchical data format library for large scientific datasets.',
    category: 'Libraries', defaultVersion: '1.14.3', moduleSystem: 'Lmod',
    availability: 'available', lastUpdatedMs: daysAgo(10),
    versions: [
      { version: '1.14.3', module: 'hdf5/1.14.3-gcc-13.2.0' },
      { version: '1.14.1', module: 'hdf5/1.14.1-gcc-12.3.0' },
      { version: '1.12.2', module: 'hdf5/1.12.2-gcc-11.4.0' },
    ],
  },
  {
    id: 'fftw', name: 'FFTW', description: 'Fast Fourier Transform library (MPI and OpenMP variants).',
    category: 'Libraries', defaultVersion: '3.3.10', moduleSystem: 'Lmod',
    availability: 'available', lastUpdatedMs: daysAgo(30),
    versions: [
      { version: '3.3.10', module: 'fftw/3.3.10-openmpi-4.1.6' },
      { version: '3.3.9', module: 'fftw/3.3.9-openmpi-4.1.4' },
    ],
  },
  {
    id: 'numpy', name: 'NumPy', description: 'Array computing core used by the Python scientific stack.',
    category: 'Data Processing', defaultVersion: '1.26.4', moduleSystem: 'Environment Modules',
    availability: 'available', lastUpdatedMs: daysAgo(6),
    versions: [
      { version: '1.26.4', module: 'numpy/1.26.4-python-3.12.3' },
      { version: '1.25.2', module: 'numpy/1.25.2-python-3.11.9' },
      { version: '1.24.4', module: 'numpy/1.24.4-python-3.10.14' },
    ],
  },
  {
    id: 'boost', name: 'Boost', description: 'Peer-reviewed portable C++ libraries.',
    category: 'Libraries', defaultVersion: '1.83.0', moduleSystem: 'Environment Modules',
    availability: 'available', lastUpdatedMs: daysAgo(33),
    versions: [
      { version: '1.83.0', module: 'boost/1.83.0-gcc-13.2.0' },
      { version: '1.82.0', module: 'boost/1.82.0-gcc-12.3.0' },
    ],
  },
  {
    id: 'mlip', name: 'MLIP', description: 'Machine-learning interatomic potentials for MD studies.',
    category: 'Machine Learning', defaultVersion: '3.1.0', moduleSystem: 'Lmod',
    availability: 'available', lastUpdatedMs: daysAgo(41),
    versions: [
      { version: '3.1.0', module: 'mlip/3.1.0' },
      { version: '2.0.1', module: 'mlip/2.0.1 (legacy)' },
    ],
  },
  {
    id: 'blast', name: 'BLAST+', description: 'Basic local alignment search tool for sequence data.',
    category: 'Bioinformatics', defaultVersion: '2.15.0', moduleSystem: 'Lmod',
    availability: 'available', lastUpdatedMs: daysAgo(19),
    versions: [
      { version: '2.15.0', module: 'blast/2.15.0' },
      { version: '2.14.0', module: 'blast/2.14.0' },
    ],
  },
  {
    id: 'gatk', name: 'GATK', description: 'Genome analysis toolkit for variant discovery.',
    category: 'Bioinformatics', defaultVersion: '4.6.0', moduleSystem: 'Environment Modules',
    availability: 'available', lastUpdatedMs: daysAgo(23),
    versions: [
      { version: '4.6.0', module: 'gatk/4.6.0' },
      { version: '4.5.0', module: 'gatk/4.5.0' },
    ],
  },
  {
    id: 'intel-oneapi', name: 'Intel oneAPI HPC', description: 'Intel compiler suite with icx/ifx and MPI runtime.',
    category: 'Compilers', defaultVersion: '2024.1.0', moduleSystem: 'Lmod',
    availability: 'restricted', lastUpdatedMs: daysAgo(13),
    versions: [
      { version: '2024.1.0', module: 'intel/2024.1.0' },
      { version: '2023.2.1', module: 'intel/2023.2.1' },
    ],
  },
  {
    id: 'paraview', name: 'ParaView', description: 'Visualisation of simulation output (MPI client/server).',
    category: 'Scientific Computing', defaultVersion: '5.12.0', moduleSystem: 'Lmod',
    availability: 'available', lastUpdatedMs: daysAgo(28),
    versions: [
      { version: '5.12.0', module: 'paraview/5.12.0-osmesa' },
      { version: '5.11.2', module: 'paraview/5.11.2' },
    ],
  },
  {
    id: 'openblas', name: 'OpenBLAS', description: 'Optimised BLAS linear-algebra library.',
    category: 'Libraries', defaultVersion: '0.3.26', moduleSystem: 'Environment Modules',
    availability: 'available', lastUpdatedMs: daysAgo(15),
    versions: [
      { version: '0.3.26', module: 'openblas/0.3.26' },
      { version: '0.3.24', module: 'openblas/0.3.24' },
    ],
  },
  {
    id: 'slurm-toolkit', name: 'Slurm toolkit', description: 'Wrappers for sbatch/saccounty scripts used in training courses.',
    category: 'Data Processing', defaultVersion: '2.4.0', moduleSystem: 'Lmod',
    availability: 'available', lastUpdatedMs: daysAgo(35),
    versions: [
      { version: '2.4.0', module: 'slurm-toolkit/2.4.0' },
      { version: '2.3.1', module: 'slurm-toolkit/2.3.1' },
    ],
  },
]

export const SOFTWARE_CATEGORIES: SoftwareCategory[] = Array.from(
  new Set(SOFTWARE.map((s) => s.category)),
).sort((a, b) => a.localeCompare(b))

/** Display date like "14 Oct 2026" from an epoch-ms value. */
export function swDateString(ms: number): string {
  return new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export const RECENT_WINDOW_MS = 30 * DAY

/** Search across name, description and every module record. */
export function softwareSearchKey(s: SoftwareApp): string {
  const modules = s.versions.map((v) => v.module).join(' ')
  return `${s.name} ${s.description} ${modules}`
}

export interface SwFilters {
  q: string
  category: SoftwareCategory | 'ALL'
  availability: Availability | 'ALL'
}

export function filterSoftware(filters: SwFilters): SoftwareApp[] {
  const needle = filters.q.trim().toLowerCase()
  return SOFTWARE.filter((s) =>
    (!needle || softwareSearchKey(s).toLowerCase().includes(needle)) &&
    (filters.category === 'ALL' || s.category === filters.category) &&
    (filters.availability === 'ALL' || s.availability === filters.availability))
}

export function sortSoftware(rows: SoftwareApp[], col: string, asc: boolean): SoftwareApp[] {
  const dir = asc ? 1 : -1
  return [...rows].sort((a, b) => {
    let r = 0
    if (col === 'name') r = a.name.localeCompare(b.name)
    else if (col === 'category') r = a.category.localeCompare(b.category)
    else if (col === 'defaultVersion') r = a.defaultVersion.localeCompare(b.defaultVersion, 'en', { numeric: true })
    else if (col === 'versions') r = a.versions.length - b.versions.length
    else if (col === 'moduleSystem') r = a.moduleSystem.localeCompare(b.moduleSystem)
    else if (col === 'availability') r = a.availability.localeCompare(b.availability)
    else if (col === 'lastUpdated') r = a.lastUpdatedMs - b.lastUpdatedMs
    else r = a.name.localeCompare(b.name)
    return r * dir
  })
}

/** Overview counts for the four stat cards — always derived from SOFTWARE. */
export function softwareCounts(): { apps: number; modules: number; categories: number; recent: number } {
  const modules = SOFTWARE.reduce((n, s) => n + s.versions.length, 0)
  const recent = SOFTWARE.filter((s) => s.lastUpdatedMs >= FROZEN - RECENT_WINDOW_MS).length
  return { apps: SOFTWARE.length, modules, categories: SOFTWARE_CATEGORIES.length, recent }
}

/* ========================= stage 2: detail records =========================
 * Detail pages freeze richer metadata per application. Records here must stay
 * consistent with the stage-1 catalogue entries they extend: the default flag
 * sits on a version that exists in the app's `versions` array and `deps`
 * always reference ids from SOFTWARE. */

export type DepRelation = 'build' | 'runtime' | 'recommended'

export interface SoftwareDep {
  appId: string
  /** Range or exact version string as constrained by the module, e.g. "3.12". */
  constraint: string
  relation: DepRelation
  mandatory: boolean
}

export interface SoftwareUsageNote {
  title: string
  detail: string
}

export interface SoftwareRecord {
  id: string
  /** One-line description rendered under the detail page title. */
  tagline: string
  homepage: string
  maintainer: string
  installPrefix: string
  /** Licence-pool availability — null fields mean no licence is metered. */
  licenceServer: string | null
  licenceFree: number | null
  licenceTotal: number | null
  loadedJobs: { total: number; sharePct: number }
  deps: SoftwareDep[]
  usage: SoftwareUsageNote[]
}

function record(
  id: string,
  tagline: string,
  homepage: string,
  maintainer: string,
  installPrefix: string,
  loadedJobs: { total: number },
  licence?: { server: string; free: number; total: number },
  deps: SoftwareDep[] = [],
  usage: SoftwareUsageNote[] = [],
): SoftwareRecord {
  const share = Math.round((loadedJobs.total / 412) * 100)
  return {
    id, tagline, homepage, maintainer, installPrefix,
    licenceServer: licence?.server ?? null,
    licenceFree: licence ? licence.free : null,
    licenceTotal: licence ? licence.total : null,
    loadedJobs: { total: loadedJobs.total, sharePct: Math.min(99, share) },
    deps, usage,
  }
}

const SW_RECORDS: Record<string, SoftwareRecord> = {
  python: record(
    'python', 'CPython interpreter with the scientific stack preinstalled.', 'python.hpc.internal/docs',
    'Languages Team', '/apps/python/3.12.3', { total: 74 },
    { server: 'flexlm-lmgrid-01', free: 38, total: 200 },
    [
      { appId: 'gcc', constraint: '13.2.0', relation: 'build', mandatory: false },
      { appId: 'openblas', constraint: '0.3.26', relation: 'runtime', mandatory: true },
      { appId: 'numpy', constraint: '1.26.4', relation: 'runtime', mandatory: false },
    ],
    [
      { title: 'Do not build against system Python', detail: 'System CPython is frozen for OS tooling. Always link extensions against a module-provided interpreter.' },
      { title: 'Virtual environments', detail: 'Create venvs under /work/<account>/venvs and point pip at the local wheelhouse to avoid repeated network fetches on compute nodes.' },
      { title: 'Threading', detail: 'Set OMP_NUM_THREADS explicitly inside sbatch scripts — the default leaves BLAS free to over-subscribe. On 64-core compute nodes a value of 8 is a good start.' },
    ],
  ),
  gcc: record(
    'gcc', 'GNU Compiler Collection — C, C++ and Fortran toolchains.', 'gcc.hpc.internal/docs',
    'Compilers Team', '/apps/gcc/13.2.0', { total: 41 },
    undefined,
    [
      { appId: 'openmpi', constraint: '4.1.6', relation: 'runtime', mandatory: false },
    ],
    [
      { title: 'Which module to load with GCC', detail: 'Loading gcc/13.2.0 also provides gcov, gfortran and the libstdc++ runtime. Pair it with openmpi/4.1.6-gcc-13.2.0 for MPI builds.' },
      { title: 'ABI compatibility', detail: 'Binaries linked against gcc/11 or older may warn on the libstdc++ dual ABI. Rebuild rather than force-loading older runtimes.' },
    ],
  ),
  openmpi: record(
    'openmpi', 'Message Passing Interface runtime for distributed workloads.', 'openmpi.hpc.internal/docs',
    'Parallel Runtime Team', '/apps/openmpi/4.1.6-gcc-13.2.0', { total: 52 },
    undefined,
    [
      { appId: 'gcc', constraint: '13.2.0', relation: 'build', mandatory: true },
      { appId: 'hdf5', constraint: '1.14.3', relation: 'build', mandatory: false },
    ],
    [
      { title: 'Fabric selection', detail: 'The default build targets the InfiniBand fabric on compute nodes. Force TCP with --mca btl tcp only on login nodes.' },
      { title: 'Oversubscription', detail: 'MPI programs launched without Slurm bindings oversubscribe cores. Keep mpirun inside sbatch allocations.' },
    ],
  ),
  cuda: record(
    'cuda', 'NVIDIA CUDA Toolkit — libraries and nvcc compiler.', 'cuda.hpc.internal/docs',
    'GPU Infrastructure', '/apps/cuda/12.4.1', { total: 36 },
    undefined,
    [
      { appId: 'gcc', constraint: '13.2.0', relation: 'build', mandatory: true },
    ],
    [
      { title: 'Driver compatibility', detail: 'Driver 535 on the GPU partition satisfies CUDA 12.x. nvcc embeds the toolkit version at compile time; running binaries only needs a compatible driver.' },
      { title: 'GPU allocation', detail: 'Request GPUs with --gres=gpu:1 or more in sbatch. CUDA programs see only the GPUs Slurm cgroup assigns.' },
    ],
  ),
  pytorch: record(
    'pytorch', 'Deep-learning framework with CUDA-enabled builds.', 'pytorch.hpc.internal/docs',
    'ML Platforms Team', '/apps/pytorch/2.3.1-foss-2024a-CUDA-12.4.0', { total: 47 },
    undefined,
    [
      { appId: 'cuda', constraint: '12.4', relation: 'runtime', mandatory: true },
      { appId: 'python', constraint: '3.12', relation: 'runtime', mandatory: true },
      { appId: 'numpy', constraint: '1.26', relation: 'runtime', mandatory: true },
    ],
    [
      { title: 'GPU builds only on the gpu partition', detail: 'The CUDA builds fail with a driver error on nodes without GPUs. Load apptainer/1.1.5 if you need a CPU-only fallback.' },
      { title: 'DataLoader workers', detail: 'High num_workers values exhaust file descriptors on login nodes. Submit a job first, then run training there.' },
      { title: 'Checkpoint to parallel filesystem', detail: 'Write checkpoints under /scratch or /work — writing to /home during training causes quota failures mid-epoch.' },
    ],
  ),
  tensorflow: record(
    'tensorflow', 'End-to-end machine-learning platform from Google.', 'tensorflow.hpc.internal/docs',
    'ML Platforms Team', '/apps/tensorflow/2.16.1', { total: 22 },
    undefined,
    [
      { appId: 'python', constraint: '3.12', relation: 'runtime', mandatory: true },
      { appId: 'numpy', constraint: '1.26', relation: 'runtime', mandatory: true },
    ],
    [
      { title: 'Version pairing', detail: 'tensorflow/2.16.x tracks Python 3.12. Older scripts pinned to 2.15 stay available; pin with module load tensorflow/2.15.0.' },
      { title: 'TF_GPU_ALLOCATOR', detail: 'Set TF_GPU_ALLOCATOR=cuda_malloc_async to reduce fragmentation on long training runs.' },
    ],
  ),
  r: record(
    'r', 'Statistics environment with Bioconductor mirrors.', 'r.hpc.internal/docs',
    'Statistics Team', '/apps/r/4.4.1', { total: 18 },
    undefined,
    [
      { appId: 'gcc', constraint: '13.2.0', relation: 'build', mandatory: false },
      { appId: 'boost', constraint: '1.83', relation: 'build', mandatory: false },
    ],
    [
      { title: 'Personal libraries', detail: 'install.packages() defaults to ~/R under /home, which is quotas-controlled. Use renv with a /work cache for project libraries.' },
      { title: 'Parallel BLAS', detail: 'The Lmod build links OpenBLAS with pthreads. R parallel workers already see all cores in an allocation; do not fork beyond that.' },
    ],
  ),
  julia: record(
    'julia', 'High-performance numerical programming language.', 'julia.hpc.internal/docs',
    'Languages Team', '/apps/julia/1.10.4', { total: 9 },
    undefined,
    [],
    [
      { title: 'Depot location', detail: 'JULIA_DEPOT_PATH is redirected to /work/$USER/julia at first use. The default /home location sits outside .julia and is read-only for packages.' },
      { title: 'Prefetching packages', detail: 'Instantiate projects inside an sbatch allocation — package server fetches are slow from login nodes during peak hours.' },
    ],
  ),
  gromacs: record(
    'gromacs', 'Molecular-dynamics simulation package optimised for GPUs.', 'gromacs.hpc.internal/docs',
    'Computational Chemistry', '/apps/gromacs/2024.2-plumed-CUDA-12.4.0', { total: 31 },
    undefined,
    [
      { appId: 'cuda', constraint: '12.4', relation: 'build', mandatory: true },
      { appId: 'openmpi', constraint: '4.1.6', relation: 'build', mandatory: true },
      { appId: 'fftw', constraint: '3.3.10', relation: 'build', mandatory: true },
    ],
    [
      { title: 'GPU offload pairs', detail: 'Use -nb gpu -pme gpu for production runs; PME offload benefits most on 13-node gpu partition jobs.' },
      { title: 'Checkpoint intervals', detail: 'Write checkpoints with -cpt 15 (minutes) so queue preemption never loses more than 15 minutes of trajectory.' },
    ],
  ),
  openfoam: record(
    'openfoam', 'Open-source CFD toolbox for continuum mechanics.', 'openfoam.hpc.internal/docs',
    'CFD Support', '/apps/openfoam/v2312', { total: 26 },
    undefined,
    [
      { appId: 'openmpi', constraint: '4.1', relation: 'build', mandatory: true },
      { appId: 'boost', constraint: '1.82', relation: 'build', mandatory: true },
    ],
    [
      { title: 'Environment sourcing', detail: 'Source $FOAM_ETC/bashrc after module load. Job templates on Submit Job already do this — copy from them rather than hand-rolling envrc files.' },
      { title: 'Parallel decomposition', detail: 'decomposePar writes to the case directory; place cases on /scratch, never in /home, or you will hit the 50 GB quota quickly.' },
    ],
  ),
  lammps: record(
    'lammps', 'Large-scale atomic/molecular massively parallel simulator.', 'lammps.hpc.internal/docs',
    'Computational Chemistry', '/apps/lammps/2023.08.02-CUDA-12.2.2', { total: 24 },
    undefined,
    [
      { appId: 'cuda', constraint: '12.2', relation: 'build', mandatory: false },
      { appId: 'openmpi', constraint: '4.1.4', relation: 'build', mandatory: true },
    ],
    [
      { title: 'Package selections matter', detail: 'The 2023.08.02 build includes MOLECULE, KSPACE, GPU and OPT packages. User packages like OPENMP require a custom rebuild — open a ticket.' },
      { title: 'Pair styles with GPUs', detail: 'Use package gpu 1 with -sf gpu in pairs; for many short runs, CPU with -sf omp sometimes wins due to copy overhead.' },
    ],
  ),
  matlab: record(
    'matlab', 'Numerical computing environment, licence-metered per seat.', 'matlab.hpc.internal/docs',
    'Engineering Software', '/apps/matlab/R2024a', { total: 11 },
    { server: 'flexlm-lmgrid-01', free: 4, total: 12 },
    [],
    [
      { title: 'Licensing and seat checks', detail: 'MATLAB checks out a seat through FlexLM at start-up. Verify Licences Remaining before an sbatch submission so queued jobs do not fail at launch.' },
      { title: 'Parallel Server', detail: 'Batch jobs using parpool consume one seat per worker beyond the head process. Keep worker counts small, or run on the licence-free Python toolchain instead.' },
    ],
  ),
  'ansys-fluent': record(
    'ansys-fluent', 'Commercial CFD solver, licence-metered per session.', 'ansys-fluent.hpc.internal/docs',
    'Engineering Software', '/apps/ansys/2024R1', { total: 14 },
    { server: 'flexlm-lmgrid-01', free: 2, total: 8 },
    [],
    [
      { title: 'Fluent licensing', detail: 'Ansys consumes solver seats by mesh size. Contact HPC support if you need a temporary seat increase for a deadline run.' },
      { title: 'Parallel coupling', detail: 'Fluent-MPI coupling expects the openmpi module matching the 2024R1 build. Mixing runtime stacks causes unexplained aborts at partition initialisation.' },
    ],
  ),
  'singularity-ce': record(
    'singularity-ce', 'Container runtime in legacy maintenance mode; scheduled for deinstallation.', 'singularity-ce.hpc.internal/docs',
    'Platforms Team', '/apps/singularity/3.8.7', { total: 2 },
    undefined,
    [],
    [
      { title: 'Migrating to Apptainer', detail: 'SingularityCE 3.8 is unsupported. Move images and workflows to apptainer/1.1.5; the SIF format is directly compatible.' },
      { title: 'Why the module is unavailable', detail: 'The module database entry is retained so historical job scripts still resolve documentation. Running the binary is blocked at the exec wrapper.' },
    ],
  ),
  apptainer: record(
    'apptainer', 'Successor to Singularity — container platform for HPC.', 'apptainer.hpc.internal/docs',
    'Platforms Team', '/apps/apptainer/1.1.5', { total: 21 },
    undefined,
    [],
    [
      { title: 'Image cache location', detail: 'Set APPTAINER_CACHEDIR to /work/$USER/apptainer before pulling; the default .apptainer under /home overflows small quotas.' },
      { title: 'Overlay filesystems', detail: 'Build with --sandbox or use per-job overlays so container layers remain immutable during job runs.' },
    ],
  ),
  hdf5: record(
    'hdf5', 'Hierarchical data format library for large scientific datasets.', 'hdf5.hpc.internal/docs',
    'Data Formats Team', '/apps/hdf5/1.14.3-gcc-13.2.0', { total: 33 },
    undefined,
    [
      { appId: 'gcc', constraint: '13.2.0', relation: 'build', mandatory: true },
    ],
    [
      { title: 'Parallel HDF5', detail: 'Load hdf5 with the openmpi-prefixed module to get the parallel build. Sequential builds cannot be linked from MPI programs.' },
      { title: 'File alignment', detail: 'Large parallel writes perform better with the default 1 MiB alignment; changing it mid-project breaks existing offsets.' },
    ],
  ),
  fftw: record(
    'fftw', 'Fast Fourier Transform library, MPI and OpenMP variants.', 'fftw.hpc.internal/docs',
    'Mathematical Libraries', '/apps/fftw/3.3.10-openmpi-4.1.6', { total: 17 },
    undefined,
    [
      { appId: 'openmpi', constraint: '4.1.6', relation: 'build', mandatory: false },
    ],
    [
      { title: 'Planning wisdom', detail: 'Use FFTW_MEASURE sparingly inside repeated job runs — the planning stage can take minutes for large transforms. FFTW_PATIENT is off by default for this reason.' },
    ],
  ),
  numpy: record(
    'numpy', 'Array computing core used by the Python scientific stack.', 'numpy.hpc.internal/docs',
    'Languages Team', '/apps/numpy/1.26.4-python-3.12.3', { total: 58 },
    undefined,
    [
      { appId: 'python', constraint: '3.12', relation: 'runtime', mandatory: true },
      { appId: 'openblas', constraint: '0.3.26', relation: 'runtime', mandatory: true },
    ],
    [
      { title: 'Module pairs with interpreter versions', detail: 'numpy/1.26.4 requires module python/3.12.3. Loading mismatched interpreter modules produces segfaults during import of compiled extensions.' },
      { title: 'Threading across nodes', detail: 'OpenBLAS inside NumPy is node-local only. For distributed arrays use Dask or MPI-based stacks.' },
    ],
  ),
  boost: record(
    'boost', 'Peer-reviewed portable C++ libraries.', 'boost.hpc.internal/docs',
    'Mathematical Libraries', '/apps/boost/1.83.0-gcc-13.2.0', { total: 19 },
    undefined,
    [
      { appId: 'gcc', constraint: '13.2.0', relation: 'build', mandatory: true },
    ],
    [],
  ),
  mlip: record(
    'mlip', 'Machine-learning interatomic potentials for MD studies.', 'mlip.hpc.internal/docs',
    'Computational Chemistry', '/apps/mlip/3.1.0', { total: 7 },
    undefined,
    [
      { appId: 'gromacs', constraint: '2024', relation: 'runtime', mandatory: false },
    ],
    [
      { title: 'Training data conventions', detail: 'Keep potential files (.pot) next to run directories on /scratch and reference them in job scripts by absolute path.' },
    ],
  ),
  blast: record(
    'blast', 'Basic local alignment search tool for sequence data.', 'blast.hpc.internal/docs',
    'Bioinformatics Team', '/apps/blast/2.15.0', { total: 12 },
    undefined,
    [],
    [
      { title: 'Database storage', detail: 'Formatted BLAST databases live under /work/biodb. Copy large databases into job-local scratch for repeated random-access workloads.' },
    ],
  ),
  gatk: record(
    'gatk', 'Genome analysis toolkit for variant discovery.', 'gatk.hpc.internal/docs',
    'Bioinformatics Team', '/apps/gatk/4.6.0', { total: 10 },
    undefined,
    [
      { appId: 'python', constraint: '3.12', relation: 'runtime', mandatory: false },
    ],
    [
      { title: 'Java heap sizing', detail: 'GATK defaults to a small JVM heap. For WGS pipelines pass --java-options "-Xmx32g" or use the himem partition.' },
    ],
  ),
  'intel-oneapi': record(
    'intel-oneapi', 'Intel compiler suite with icx/icpx and MPI runtime.', 'intel-oneapi.hpc.internal/docs',
    'Compilers Team', '/apps/intel/2024.1.0', { total: 15 },
    { server: 'flexlm-lmgrid-01', free: 6, total: 16 },
    [
      { appId: 'openmpi', constraint: '4.1.6', relation: 'runtime', mandatory: false },
    ],
    [
      { title: 'Licence server reachability', detail: 'icc and ifx check out seats on first invocation. If the FlexLM pool is exhausted at start-up the compiler exits with licence error -1041; retry off-peak.' },
      { title: 'icx vs icc', detail: 'The 2024.1.0 module installs both classic icc and the LLVM-based icx. New projects should standardise on icx; icc remains for legacy code.' },
    ],
  ),
  paraview: record(
    'paraview', 'Visualisation of simulation output, MPI client/server.', 'paraview.hpc.internal/docs',
    'Visualisation Team', '/apps/paraview/5.12.0-osmesa', { total: 8 },
    undefined,
    [
      { appId: 'python', constraint: '3.12', relation: 'runtime', mandatory: false },
    ],
    [
      { title: 'Off-screen rendering', detail: 'The osmesa build renders without a display server, which is what pvserver expects on compute nodes. The desktop client uses the local OpenGL stack.' },
      { title: 'Connect from your workstation', detail: 'Run pvserver under sbatch, then connect the client through the SSH tunnel described in the ParaView quick-start. Submit Job templates exist for this pattern.' },
    ],
  ),
  openblas: record(
    'openblas', 'Optimised BLAS linear-algebra library.', 'openblas.hpc.internal/docs',
    'Mathematical Libraries', '/apps/openblas/0.3.26', { total: 44 },
    undefined,
    [],
    [
      { title: 'Thread control', detail: 'OpenBLAS reads OPENBLAS_NUM_THREADS first, then OMP_NUM_THREADS. Inside sbatch both are aligned to the allocation by the prologue script.' },
    ],
  ),
  'slurm-toolkit': record(
    'slurm-toolkit', 'Training wrappers around sbatch and sacct.', 'slurm-toolkit.hpc.internal/docs',
    'User Services', '/apps/slurm-toolkit/2.4.0', { total: 6 },
    undefined,
    [
      { appId: 'python', constraint: '3.12', relation: 'runtime', mandatory: false },
    ],
    [
      { title: 'Course images', detail: 'The toolkit pins the training course module set. It also demonstrates safe defaults for --mem and --time that new users often miss.' },
    ],
  ),
}

/** Detail metadata for a catalogue entry — null when the id is unknown. */
export function softwareRecord(id: string): SoftwareRecord | null {
  return SW_RECORDS[id] ?? null
}

/** Licence chip text: "4 of 12 free" or a plain no-licence note. */
export function licenceText(r: SoftwareRecord): string {
  if (r.licenceServer == null || r.licenceTotal == null || r.licenceFree == null) return 'No licence required'
  return `${r.licenceFree} of ${r.licenceTotal} seats free · ${r.licenceServer}`
}

/* ====================== stage 3: job submission integration ======================
 * Compatibility metadata consumed by the module picker on the Submit Job page:
 * explicit conflict rules (pair-keyed, never inferred from names), the module
 * line a job script should load for a chosen version, and per-application
 * scheduling suggestions. Handoff between "Use in Job" and Submit Job keeps
 * the application id plus an exact module string so the version survives the
 * navigation. */

export interface SwConflictRule {
  a: string
  b: string
  reason: string
}

/** Explicit mock compatibility rules — the picker warns only from this table. */
export const SW_CONFLICTS: SwConflictRule[] = [
  { a: 'gcc', b: 'intel-oneapi', reason: 'Conflicting compiler toolchains — pick either GCC or Intel oneAPI as the build environment, not both.' },
  { a: 'openmpi', b: 'intel-oneapi', reason: 'Incompatible MPI runtimes — Intel oneAPI bundles its own MPI implementation (Intel MPI). Loading Open MPI alongside it is unsupported.' },
  { a: 'openmpi', b: 'cuda', reason: 'Incompatible CUDA dependencies — the installed Open MPI builds are CPU-only; GPU transport requires the CUDA-aware module set, not a raw cuda/ module.' },
  { a: 'matlab', b: 'julia', reason: 'Both packages claim the MATLAB/Jupyter desktop runtime hooks on the shared licence daemon; loading both in one job has caused lock contention.' },
  { a: 'tensorflow', b: 'gromacs', reason: 'Incompatible CUDA dependencies — TensorFlow requires CUDA 12.4 libraries while GROMACS pins CUDA 12.2; the two module trees cannot coexist.' },
  { a: 'lammps', b: 'gromacs', reason: 'Incompatible CUDA dependencies — LAMMPS 2023.08 links CUDA 12.2 with GCC 12 headers while GROMACS 2024 uses GCC 13; the merged environment fails to link.' },
]

/** True when the two applications are covered by an explicit conflict rule. */
export function swConflict(a: string, b: string): SwConflictRule | null {
  for (const r of SW_CONFLICTS) {
    if ((r.a === a && r.b === b) || (r.a === b && r.b === a)) return r
  }
  return null
}

/** All pairwise conflicts inside a selection, deduplicated per application pair. */
export function swConflictsFor(mods: Array<{ appId: string }>): SwConflictRule[] {
  const out: SwConflictRule[] = []
  for (let i = 0; i < mods.length; i += 1) {
    for (let j = i + 1; j < mods.length; j += 1) {
      const rule = swConflict(mods[i]!.appId, mods[j]!.appId)
      if (rule && !out.some((x) => x === rule)) out.push(rule)
    }
  }
  return out
}

/** The module line a job script loads for the given app + version, or null. */
export function swModuleLine(appId: string, version?: string): string | null {
  const app = SOFTWARE.find((s) => s.id === appId)
  if (!app) return null
  const v = app.versions.find((x) => x.version === (version ?? app.defaultVersion)) ?? app.versions[0]
  return v?.module ?? null
}

/** A module staged onto the Submit Job form: application id, exact module
 * string, and whether it came from a user pick (vs. a "Use in Job" handoff). */
export interface SwModulePick {
  appId: string
  module: string
  manual: boolean
}

export interface SwJobSuggestion {
  partition: 'compute' | 'gpu' | 'himem'
  gpus: number
  example: string
}

/**
 * Scheduling suggestion per application. Suggested values never overwrite
 * populated job fields on their own — the Submit Job page only applies them
 * to pristine fields, inside a merge preview, or when the user accepts
 * "Load suggested values".
 */
export const SW_JOB_SUGGESTIONS: Partial<Record<string, SwJobSuggestion>> = {
  python: { partition: 'compute', gpus: 0, example: 'python analysis.py --input /shared/data/run.h5' },
  gcc: { partition: 'compute', gpus: 0, example: './configure && make -j $SLURM_CPUS_ON_NODE' },
  openmpi: { partition: 'compute', gpus: 0, example: 'mpirun -np $SLURM_NTASKS ./wave3d --nx 2048' },
  cuda: { partition: 'gpu', gpus: 1, example: './deviceQuery' },
  pytorch: { partition: 'gpu', gpus: 1, example: 'python train.py --epochs 100 --batch-size 128' },
  tensorflow: { partition: 'gpu', gpus: 1, example: 'python train_cnn.py --epochs 50' },
  r: { partition: 'compute', gpus: 0, example: 'Rscript analysis.R --input /shared/data/results.rds' },
  julia: { partition: 'compute', gpus: 0, example: 'julia --project=. solve.jl' },
  gromacs: { partition: 'gpu', gpus: 1, example: 'gmx mdrun -deffnm md_run -nb gpu' },
  openfoam: { partition: 'compute', gpus: 0, example: 'decomposePar && mpirun -np $SLURM_NTASKS foamExec simpleFoam -parallel' },
  lammps: { partition: 'gpu', gpus: 1, example: 'lmp -in in.lj -sf gpu -pk gpu 1' },
  matlab: { partition: 'himem', gpus: 0, example: 'matlab -batch "run(\'/shared/jobs/parametersweep.m\')"' },
  'ansys-fluent': { partition: 'himem', gpus: 0, example: 'fluent 3ddp -t$SLURM_NTASKS -g -i journal.jou' },
  'singularity-ce': { partition: 'compute', gpus: 0, example: 'singularity exec containers/biotools.sif bcftools --version' },
  apptainer: { partition: 'compute', gpus: 0, example: 'apptainer run containers/pysci.sif python work.py' },
  hdf5: { partition: 'compute', gpus: 0, example: 'h5dump -H /shared/datasets/sample.h5' },
  fftw: { partition: 'compute', gpus: 0, example: './bench_fftw --size 4096' },
  numpy: { partition: 'compute', gpus: 0, example: 'python -c "import numpy; numpy.test()"' },
  boost: { partition: 'compute', gpus: 0, example: './unit_tests --log_level=test_suite' },
  mlip: { partition: 'compute', gpus: 0, example: 'mlp trainPot.cfg init.cfg pot.mtp' },
  blast: { partition: 'himem', gpus: 0, example: 'blastp -query query.fa -db nr -num_threads $SLURM_CPUS_ON_NODE' },
  gatk: { partition: 'himem', gpus: 0, example: 'gatk --java-options "-Xmx64g" HaplotypeCaller -R ref.fa -I sample.bam -O out.vcf' },
  'intel-oneapi': { partition: 'compute', gpus: 0, example: 'icx -O2 -qopenmp solver.c -o solver' },
  paraview: { partition: 'compute', gpus: 0, example: 'pvbatch render.py' },
  openblas: { partition: 'compute', gpus: 0, example: 'OQS=$SLURM_CPUS_ON_NODE ./matmul_bench --n 8192' },
  'slurm-toolkit': { partition: 'compute', gpus: 0, example: 'sbatch --wrap="training_job.sh"' },
}

export const swJobSuggestion = (id: string): SwJobSuggestion | null => SW_JOB_SUGGESTIONS[id] ?? null

/* Lmod resolves dependency trees automatically, so the picker surfaces
 * dependency metadata for information only — job scripts carry explicit
 * `module load` lines for the primary selection (and legacy Environment
 * Modules entries) but never auto-expand the full graph. */
export const SW_DEPS_AUTO_RESOLVE: Record<ModuleSystem, { loads: boolean; note: string }> = {
  Lmod: { loads: false, note: 'Lmod resolves the dependency tree automatically — load the primary module and its required runtime deps attach on the fly.' },
  'Environment Modules': { loads: true, note: 'Environment Modules does not resolve dependencies automatically — keep every dep listed as runtime + required loaded explicitly.' },
}
