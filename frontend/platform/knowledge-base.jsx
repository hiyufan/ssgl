// Knowledge Base — RAG document management + search/ask

const KnowledgeBase = () => {
  const [docs, setDocs] = React.useState([]);
  const [stats, setStats] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [tab, setTab] = React.useState('docs'); // docs | search | ingest
  const [searchQuery, setSearchQuery] = React.useState('');
  const [searchResults, setSearchResults] = React.useState([]);
  const [searching, setSearching] = React.useState(false);
  const [ingestText, setIngestText] = React.useState('');
  const [ingestTitle, setIngestTitle] = React.useState('');
  const [ingesting, setIngesting] = React.useState(false);
  const [uploadFile, setUploadFile] = React.useState(null);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const [docsRes, statsRes] = await Promise.all([
          ragDocsAPI.list().catch(() => ({ documents: [] })),
          ragDocsAPI.stats().catch(() => null),
        ]);
        setDocs(docsRes.documents || []);
        setStats(statsRes);
      } catch (e) {
        console.error('KB fetch error:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await ragDocsAPI.search({ query: searchQuery, top_k: 5 });
      setSearchResults(res.results || res.hits || []);
    } catch (e) {
      console.error('Search error:', e);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleIngest = async () => {
    if (!ingestText.trim()) return;
    setIngesting(true);
    try {
      await ragDocsAPI.ingest({ text: ingestText, title: ingestTitle || 'Untitled' });
      // Refresh docs
      const docsRes = await ragDocsAPI.list();
      setDocs(docsRes.documents || []);
      setIngestText('');
      setIngestTitle('');
      setTab('docs');
    } catch (e) {
      console.error('Ingest error:', e);
    } finally {
      setIngesting(false);
    }
  };

  const handleUpload = async () => {
    if (!uploadFile) return;
    setIngesting(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      await ragDocsAPI.upload(formData);
      const docsRes = await ragDocsAPI.list();
      setDocs(docsRes.documents || []);
      setUploadFile(null);
      setTab('docs');
    } catch (e) {
      console.error('Upload error:', e);
    } finally {
      setIngesting(false);
    }
  };

  const handleDelete = async (docId) => {
    try {
      await ragDocsAPI.delete(docId);
      setDocs(docs.filter(d => d.id !== docId));
    } catch (e) {
      console.error('Delete error:', e);
    }
  };

  if (loading) return <PageWrap><Spinner size={40} /></PageWrap>;

  return (
    <PageWrap>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#F5F0FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Ic n="layers" s={18} c="#7C3AED"/>
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#1F2329' }}>知识库管理</div>
            <div style={{ fontSize: 12, color: '#8F959E' }}>上传文档/文本 → 分块嵌入 → 搜索问答</div>
          </div>
        </div>
      </div>

      {/* Stats banner */}
      {stats && (
        <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
          {[
            { label: '文档总数', value: stats.total_documents || docs.length, color: '#3370FF' },
            { label: '文本分块', value: stats.total_chunks || 0, color: '#7C3AED' },
            { label: '向量维度', value: stats.embedding_dimension || 1536, color: '#00B42A' },
          ].map(s => (
            <Card key={s.label} style={{ flex: 1, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 8, height: 32, borderRadius: 4, background: s.color }}></div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#1F2329' }}>{s.value}</div>
                <div style={{ fontSize: 12, color: '#8F959E' }}>{s.label}</div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, background: '#fff', border: '1px solid #E5E6E8', borderRadius: 8, padding: 3, marginBottom: 16, width: 'fit-content' }}>
        {[
          ['docs', '文档列表', 'file'],
          ['search', '搜索问答', 'search'],
          ['ingest', '导入数据', 'plus'],
        ].map(([k, l, icon]) => (
          <div key={k} onClick={() => setTab(k)} style={{
            padding: '6px 16px', borderRadius: 6, fontSize: 13, cursor: 'pointer',
            fontWeight: tab === k ? 600 : 400,
            background: tab === k ? '#7C3AED' : 'transparent',
            color: tab === k ? '#fff' : '#646A73',
            display: 'flex', alignItems: 'center', gap: 6,
            transition: 'all .15s',
          }}>
            <Ic n={icon} s={13} c={tab === k ? '#fff' : '#8F959E'}/>{l}
          </div>
        ))}
      </div>

      {/* Documents Tab */}
      {tab === 'docs' && (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <Table
            cols={[
              { key: 'title', title: '文档名称', render: (v, row) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: '#F5F0FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Ic n="file" s={14} c="#7C3AED"/>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#1F2329' }}>{v || 'Untitled'}</div>
                    <div style={{ fontSize: 11, color: '#8F959E' }}>{row.source || 'text'}</div>
                  </div>
                </div>
              )},
              { key: 'chunks', title: '分块数', render: v => <span style={{ fontWeight: 600 }}>{v || '-'}</span> },
              { key: 'created_at', title: '导入时间', render: v => <span style={{ color: '#8F959E', fontSize: 12 }}>{v?.split('T')[0] || '-'}</span> },
              { key: 'id', title: '操作', render: (v) => (
                <div style={{ display: 'flex', gap: 6 }}>
                  <Btn size="sm" variant="secondary" icon={<Ic n="eye" s={12} c="#646A73"/>} onClick={() => { setTab('search'); setSearchQuery(''); }}>查看</Btn>
                  <Btn size="sm" variant="secondary" icon={<Ic n="x" s={12} c="#F53F3F"/>} onClick={() => handleDelete(v)}>删除</Btn>
                </div>
              )},
            ]}
            rows={docs}
          />
          {docs.length === 0 && <Empty text="暂无文档" sub="点击「导入数据」添加知识库文档"/>}
        </Card>
      )}

      {/* Search Tab */}
      {tab === 'search' && (
        <div>
          <Card style={{ padding: 20, marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: '#F7F8FA', border: '1px solid #E5E6E8', borderRadius: 8, padding: '10px 14px' }}>
                <Ic n="search" s={15} c="#8F959E"/>
                <input
                  value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  placeholder="输入问题，基于知识库搜索相关文档..."
                  style={{ border: 'none', background: 'none', fontSize: 14, width: '100%', outline: 'none', fontFamily: 'inherit' }}
                />
              </div>
              <Btn icon={searching ? <Spinner size={14} color="#fff"/> : <Ic n="search" s={14} c="#fff"/>} onClick={handleSearch} disabled={searching || !searchQuery.trim()}>
                {searching ? '搜索中...' : '搜索'}
              </Btn>
            </div>
          </Card>

          {searchResults.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {searchResults.map((r, i) => (
                <Card key={i} style={{ padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <div style={{
                      background: '#7C3AED', color: '#fff', borderRadius: 6,
                      padding: '2px 8px', fontSize: 11, fontWeight: 700,
                    }}>
                      #{i + 1}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1F2329' }}>{r.title || r.document_title || '文档片段'}</div>
                    {r.score !== undefined && (
                      <span style={{ fontSize: 11, color: '#7C3AED', background: '#F5F0FF', padding: '2px 8px', borderRadius: 99, fontWeight: 600 }}>
                        相似度 {(r.score * 100).toFixed(1)}%
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 13, color: '#646A73', lineHeight: 1.8, background: '#FAFBFC', padding: 12, borderRadius: 6, border: '1px solid #F0F1F3' }}>
                    {r.content || r.text || r.chunk || JSON.stringify(r).slice(0, 300)}
                  </div>
                </Card>
              ))}
            </div>
          )}

          {searchResults.length === 0 && searchQuery && !searching && (
            <Empty text="未找到相关文档" sub="试试其他关键词"/>
          )}
        </div>
      )}

      {/* Ingest Tab */}
      {tab === 'ingest' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Text ingest */}
          <Card style={{ padding: 20 }}>
            <SHead title="文本导入" sub="直接输入文本内容导入知识库"/>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#1F2329', display: 'block', marginBottom: 6 }}>文档标题</label>
                <input
                  value={ingestTitle} onChange={e => setIngestTitle(e.target.value)}
                  placeholder="输入文档标题..."
                  style={{ width: '100%', border: '1px solid #E5E6E8', borderRadius: 8, padding: '10px 14px', fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#1F2329', display: 'block', marginBottom: 6 }}>文本内容</label>
                <textarea
                  value={ingestText} onChange={e => setIngestText(e.target.value)}
                  placeholder="粘贴或输入要导入的文本内容..."
                  style={{ width: '100%', height: 200, border: '1px solid #E5E6E8', borderRadius: 8, padding: '12px 14px', fontSize: 13, fontFamily: 'inherit', resize: 'vertical', outline: 'none', lineHeight: 1.7, boxSizing: 'border-box' }}
                />
              </div>
              <Btn full icon={ingesting ? <Spinner size={14} color="#fff"/> : <Ic n="plus" s={14} c="#fff"/>} onClick={handleIngest} disabled={ingesting || !ingestText.trim()}>
                {ingesting ? '导入中...' : '开始导入'}
              </Btn>
            </div>
          </Card>

          {/* File upload */}
          <Card style={{ padding: 20 }}>
            <SHead title="文件上传" sub="上传 PDF、TXT、Markdown 等格式文件"/>
            <div style={{ marginTop: 12 }}>
              <div style={{
                border: '2px dashed #E5E6E8', borderRadius: 12, padding: '40px 20px',
                textAlign: 'center', cursor: 'pointer', transition: 'all .15s',
                background: uploadFile ? '#F5F0FF' : '#FAFBFC',
                borderColor: uploadFile ? '#7C3AED' : '#E5E6E8',
              }}
                onClick={() => document.getElementById('kb-file-input').click()}
                onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = '#7C3AED'; }}
                onDragLeave={e => { e.currentTarget.style.borderColor = '#E5E6E8'; }}
                onDrop={e => { e.preventDefault(); setUploadFile(e.dataTransfer.files[0]); }}
              >
                <input id="kb-file-input" type="file" style={{ display: 'none' }}
                  accept=".pdf,.txt,.md,.csv,.json"
                  onChange={e => setUploadFile(e.target.files[0])}
                />
                <Ic n="upload" s={32} c={uploadFile ? '#7C3AED' : '#C9CDD4'}/>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1F2329', marginTop: 12 }}>
                  {uploadFile ? uploadFile.name : '点击或拖拽文件到此处'}
                </div>
                <div style={{ fontSize: 12, color: '#8F959E', marginTop: 4 }}>
                  支持 PDF、TXT、Markdown、CSV、JSON 格式
                </div>
              </div>
              {uploadFile && (
                <div style={{ marginTop: 16 }}>
                  <Btn full icon={ingesting ? <Spinner size={14} color="#fff"/> : <Ic n="upload" s={14} c="#fff"/>} onClick={handleUpload} disabled={ingesting}>
                    {ingesting ? '上传中...' : '上传并导入'}
                  </Btn>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </PageWrap>
  );
};

Object.assign(window, { KnowledgeBase });
