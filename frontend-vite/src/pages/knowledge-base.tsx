import { useState } from 'react';
import { ragAPI } from '@/services/api';
import { Icon } from '@/components/ui/icon';
import { PageHeader, SectionLabel } from '@/components/ui/page-helpers';

export function KnowledgeBasePage() {
  const [search, setSearch] = useState('');

  // Static display for now — real RAG integration via aiToolsPage
  const docs = [
    { id: 1, title: '2025 全国创新创业大赛 · 决赛答辩材料', type: 'pdf', size: '3.2 MB', tags: ['往届优秀', 'PPT'], updated_at: '2026-01-25T00:00:00Z', author: '极光科技' },
    { id: 2, title: 'AI 创新赛道 · 评审评分标准 v2.3', type: 'doc', size: '1.1 MB', tags: ['评审标准', '规则'], updated_at: '2026-06-01T00:00:00Z', author: '赛事组委会' },
    { id: 3, title: '智能客服系统竞品分析报告 2026', type: 'pdf', size: '5.6 MB', tags: ['市场分析', '竞品'], updated_at: '2026-05-20T00:00:00Z', author: '王家国' },
    { id: 4, title: 'RAG 技术原理与最佳实践 · 技术文档', type: 'md', size: '0.8 MB', tags: ['技术文档', 'RAG'], updated_at: '2026-04-10T00:00:00Z', author: '刘子燕' },
  ];

  const typeIcons: Record<string, string> = { pdf: '📄', doc: '📝', md: '📋' };
  const typeColors: Record<string, string> = { pdf: 'var(--red)', doc: 'var(--teal)', md: 'var(--purple)' };

  const filtered = docs.filter(doc => !search || doc.title.includes(search) || doc.tags.some(t => t.includes(search)));

  return (
    <div className="forge-page">
      <PageHeader
        title="知识库管理"
        subtitle="RAG 检索知识库 · 为 AI 工具提供上下文"
        actions={<button className="btn btn-primary"><Icon name="plus" size={13}/>上传文档</button>}
      />

      <div className="anim-in" style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 36, padding: '0 12px', borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--border)', flex: 1, maxWidth: 360 }}>
          <Icon name="search" size={14}/>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索文档…"
            style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 13, color: 'var(--text)', width: '100%' }}/>
        </div>
      </div>

      <div className="card anim-in d1" style={{ padding: 14, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 0 4px var(--green-bg)' }}/>
        <span style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 600 }}>RAG Pipeline 运行正常</span>
        <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>HNSW 索引 · bge-large-zh-v1.5</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
        {filtered.map((doc, i) => (
          <div key={doc.id} className={`card anim-in d${Math.min(i + 1, 8)}`}
            style={{ padding: 18, cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow)'; e.currentTarget.style.borderColor = typeColors[doc.type]; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; e.currentTarget.style.borderColor = 'var(--border)'; }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0, border: '1px solid var(--border)' }}>
                {typeIcons[doc.type] || '📄'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', lineHeight: 1.4, marginBottom: 4 }}>{doc.title}</div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 8, background: `${typeColors[doc.type]}18`, color: typeColors[doc.type], fontFamily: 'var(--font-mono)', fontWeight: 600 }}>.{doc.type}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{doc.size}</span>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 12 }}>
              {doc.tags.map(tag => <span key={tag} className="badge badge-muted">{tag}</span>)}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid var(--border)' }}>
              <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{doc.author} · {new Date(doc.updated_at).toLocaleDateString('zh-CN')}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
