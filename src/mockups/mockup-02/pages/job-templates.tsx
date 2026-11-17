import { useMemo, useState } from 'react'
import * as Lucide from 'lucide-react'
import { Breadcrumbs, Card, CardB, CardH, StateChipText, emitToast, navTo } from '../components/ui'

type Template = {
  id: string
  name: string
  desc: string
  partition: string
  walltime: string
  resources: string
  script: string
  kind: 'green' | 'blue' | 'purple'
}

const TEMPLATES: Template[] = [
  {
    id: 'tpl-gpu-train', name: 'GPU training — single node', desc: 'Reserve 1 GPU node with 4 GPUs for model training runs.',
    partition: 'gpu', walltime: '08:00:00', resources: '--gres=gpu:4 --cpus-per-task=32 --mem=128G', kind: 'purple',
    script: `#!/bin/bash
#SBATCH --partition=gpu
#SBATCH --gres=gpu:4
#SBATCH --cpus-per-task=32
#SBATCH --mem=128G
#SBATCH --time=08:00:00
module load cuda/12.4
python train.py --epochs 100`,
  },
  {
    id: 'tpl-cpu-array', name: 'CPU job array', desc: 'Parameter sweep across 64 CPU tasks on the compute partition.',
    partition: 'compute', walltime: '02:00:00', resources: '--array=1-64 --cpus-per-task=8 --mem=16G', kind: 'blue',
    script: `#!/bin/bash
#SBATCH --partition=compute
#SBATCH --array=1-64
#SBATCH --cpus-per-task=8
#SBATCH --mem=16G
#SBATCH --time=02:00:00
python sweep.py --task $SLURM_ARRAY_TASK_ID`,
  },
  {
    id: 'tpl-himem', name: 'High-memory analysis', desc: 'Single task with 1 TB RAM on the himem partition for large in-memory datasets.',
    partition: 'himem', walltime: '12:00:00', resources: '--cpus-per-task=16 --mem=1000G', kind: 'green',
    script: `#!/bin/bash
#SBATCH --partition=himem
#SBATCH --cpus-per-task=16
#SBATCH --mem=1000G
#SBATCH --time=12:00:00
./analyse --input /shared/datasets/large.h5`,
  },
]

export function JobTemplatesPage() {
  const [q, setQ] = useState('')
  const shown = useMemo(() => TEMPLATES.filter((t) => (t.name + t.partition).toLowerCase().includes(q.toLowerCase())), [q])

  return (
    <>
      <Breadcrumbs items={[{ label: 'Workloads' }, { label: 'Job Templates' }]} />
      <div className="a2-pagehead">
        <div>
          <h1 className="aws2-h1">Job Templates</h1>
          <div className="a2-pagehead-sub">Reusable sbatch templates maintained by cluster administrators</div>
        </div>
        <div className="a2-pagehead-actions">
          <input className="aws2-input" placeholder="Search templates" value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="aws2-btn" onClick={() => emitToast('info', 'Template creation is simulated in this prototype')}><Lucide.Plus size={14} />Create template</button>
        </div>
      </div>

      <div className="a2-tpl-grid">
        {shown.map((t) => (
          <Card key={t.id} className="a2-tpl-card">
            <CardH>
              <span className="a2-tpl-name">{t.name}</span>
              <StateChipText kind={t.kind} text={t.partition} />
            </CardH>
            <CardB>
              <p className="a2-tpl-desc">{t.desc}</p>
              <div className="a2-kvrow"><div className="a2-kv-k">Resources</div><div className="a2-kv-v mono">{t.resources}</div></div>
              <div className="a2-kvrow"><div className="a2-kv-k">Walltime</div><div className="a2-kv-v mono">{t.walltime}</div></div>
              <details className="a2-tpl-script">
                <summary>Job script</summary>
                <pre className="a2-logpre a2-logpre--tight">{t.script}</pre>
              </details>
              <div className="a2-tpl-foot">
                <button className="aws2-btn aws2-btn--sm" onClick={() => navTo({ page: 'submit-job' })}><Lucide.Play size={13} />Use template</button>
              </div>
            </CardB>
          </Card>
        ))}
        {shown.length === 0 && <Card className="a2-span-all"><CardB><div className="a2-empty">No templates match “{q}”.</div></CardB></Card>}
      </div>
    </>
  )
}
