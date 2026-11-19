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
