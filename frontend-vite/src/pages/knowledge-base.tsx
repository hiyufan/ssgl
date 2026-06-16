import { useEffect, useState, useRef } from 'react';
import { ragAPI } from '@/services/api';
import { Icon } from '@/components/ui/icon';
import { PageHeader, SectionLabel } from '@/components/ui/page-helpers';
import { EmptyState } from '@/components/ui/empty-state';
import type { RAGDocument, RAGStats } from '@/types';

type RagResult = { content: string; metadata: Record<string, unknown>; score: number };

export function KnowledgeBasePage() {
  const [docs, setDocs] = useState<RAGDocument[]>([]);
  const [stats, setStats] = useState<RAGStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const [ragQuery, setRagQuery] = useState('');
  const [ragResults, setRagResults] = useState<RagResult[] | null>(null);
  const [ragLoading, setRagLoading] = useState(false);
  const [ragAnswer, setRagAnswer] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      ragAPI.listDocuments(),
      ragAPI.getStats(),
    ])
      .then(([docRes, statsRes]) => {
        setDocs(docRes.documents || []);
        setStats(statsRes);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await ragAPI.uploadFile(file);
      fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (filename: string) => {
    if (!confirm(`确认删除文档「${filename}」？所有相关分块将被永久移除。`)) return;
    try {
      await ragAPI.deleteDocument(filename);
      setDocs(prev => prev.filter(d => d.filename !== filename));
      if (stats) {
        setStats(prev => prev ? { ...prev, total_documents: prev.total_documents - 1 } : null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRagQuery = async () => {
    if (!ragQuery.trim()) return;
    setRagLoading(true);
    setRagResults(null);
    setRagAnswer(null);
    try {
      const res = await ragAPI.query(ragQuery);
      setRagAnswer(res.answer || null);
      setRagResults((res.sources || []) as RagResult[]);
    } catch (err) {
      console.error('RAG query error:', err);
      setRagAnswer('查询失败，请稍后重试');
    } finally {
      setRagLoading(false);
    }
  };

  const handleRagSearch = async () => {
    if (!ragQuery.trim()) return;
    setRagLoading(true);
    setRagResults(null);
    setRagAnswer(null);
    try {
      const res = await ragAPI.search(ragQuery);
      setRagResults((res.results || []) as RagResult[]);
    } catch (err) {
      console.error('RAG search error:', err);
    } finally {
      setRagLoading(false);
    }
  };

  const filtered = docs.filter(doc => !search || doc.filename.toLowerCase().includes(search.toLowerCase()));

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
        <svg width={32} height={32} viewBox="0 0 24 24" style={{ animation: 'forge-spin 0.7s linear infinite' }}>
          <circle cx="12" cy="12" r="10" fill="none" stroke="var(--border-2)" strokeWidth="2.5"/>
          <path d="M12 2a10 10 0 0110 10" fill="none" stroke="var(--amber)" strokeWidth="2.5" strokeLinecap="round"/>
        </svg>
      </div>
    );
  }

  return (
    <div className="forge-page">
      <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.txt,.md" style={{ display: 'none' }} onChange={handleUpload}/>

      <PageHeader
        title="知识库管理"
        subtitle="RAG 检索知识库 · 为 AI 工具提供上下文"
        actions={
          <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            <Icon name="plus" size={13}/> {uploading ? '上传中…' : '上传文档'}
          </button>
        }
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
        <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
          {stats ? `${stats.total_documents} 文档 · ${stats.total_chunks} 分块` : '加载中…'}
        </span>
      </div>

      {/* RAG Query Section */}
      <div className="card anim-in d2" style={{ padding: 20, marginBottom: 20 }}>
        <SectionLabel label="🔍 智能问答" />
        <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 12 }}>基于知识库的 RAG 检索问答，输入问题获取 AI 回答</p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input
            value={ragQuery}
            onChange={e => setRagQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleRagQuery(); }}
            placeholder="输入问题，如：蓝桥杯竞赛的参赛经验有哪些？"
            style={{ flex: 1, height: 40, padding: '0 14px', borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--border)', fontSize: 13, color: 'var(--text)', outline: 'none' }}
          />
          <button className="btn btn-primary" onClick={handleRagQuery} disabled={ragLoading || !ragQuery.trim()} style={{ minWidth: 80 }}>
            {ragLoading ? '查询中…' : 'AI 问答'}
          </button>
          <button className="btn btn-outline" onClick={handleRagSearch} disabled={ragLoading || !ragQuery.trim()} style={{ minWidth: 80 }}>
            语义搜索
          </button>
        </div>

        {/* RAG Answer */}
        {ragAnswer && (
          <div style={{ padding: 16, borderRadius: 10, background: 'var(--amber-bg)', border: '1px solid var(--amber-border)', marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--amber)', marginBottom: 8, letterSpacing: '0.05em' }}>AI 回答</div>
            <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{ragAnswer}</div>
          </div>
        )}

        {/* RAG Search Results */}
        {ragResults && ragResults.length > 0 && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', marginBottom: 8 }}>匹配到 {ragResults.length} 条相关片段</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {ragResults.map((r, i) => (
                <div key={i} style={{ padding: 12, borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.6, marginBottom: 6 }}>{r.content}</div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {r.score != null && (
                      <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--green)', fontWeight: 600 }}>
                        相似度: {(r.score * 100).toFixed(1)}%
                      </span>
                    )}
                    {Boolean(r.metadata?.filename) && (
                      <span style={{ fontSize: 10, color: 'var(--text-3)' }}>来源: {String(r.metadata.filename)}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {ragResults && ragResults.length === 0 && !ragLoading && !ragAnswer && (
          <div style={{ textAlign: 'center', padding: 16, color: 'var(--text-3)', fontSize: 13 }}>未找到相关结果</div>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="file" title="暂无文档" desc="点击上方「上传文档」添加第一份知识库文档"/>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
          {filtered.map((doc, i) => {
            const ext = doc.filename.split('.').pop()?.toLowerCase() || '';
            const typeIcons: Record<string, string> = { pdf: '📄', doc: '📝', docx: '📝', md: '📋', txt: '📄' };
            const typeColors: Record<string, string> = { pdf: 'var(--red)', doc: 'var(--teal)', docx: 'var(--teal)', md: 'var(--purple)', txt: 'var(--text-3)' };
            return (
              <div key={doc.filename} className={`card anim-in d${Math.min(i + 1, 8)}`}
                style={{ padding: 18, transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0, border: '1px solid var(--border)' }}>
                    {typeIcons[ext] || '📄'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', lineHeight: 1.4, marginBottom: 4, wordBreak: 'break-all' }}>{doc.filename}</div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 8, background: `${typeColors[ext] || 'var(--text-3)'}18`, color: typeColors[ext] || 'var(--text-3)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>.{ext}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{doc.chunk_count} 分块</span>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                    {doc.created_at ? new Date(doc.created_at).toLocaleDateString('zh-CN') : '-'}
                  </span>
                  <button
                    onClick={() => handleDelete(doc.filename)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 6, color: 'var(--text-3)', transition: 'all 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--red)'; e.currentTarget.style.background = 'var(--red-bg)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-3)'; e.currentTarget.style.background = 'none'; }}
                    title="删除文档"
                  >
                    <Icon name="trash" size={14}/>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
