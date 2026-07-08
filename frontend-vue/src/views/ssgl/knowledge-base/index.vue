<template>
  <section class="ssgl-page kb-page" data-page="KnowledgeBase">
    <SSGLPageHeader title="知识库管理" subtitle="RAG 检索知识库 · 为 AI 工具提供上下文">
      <template #actions>
        <div class="kb-header-actions">
          <ElButton @click="showTextIngest = true">
            <ElIcon><Edit /></ElIcon>
            文本录入
          </ElButton>
          <ElButton type="primary" :loading="uploading" @click="fileInputRef?.click()">
            <ElIcon><Plus /></ElIcon>
            {{ uploading ? '上传中…' : '上传文档' }}
          </ElButton>
        </div>
      </template>
    </SSGLPageHeader>

    <input
      ref="fileInputRef"
      type="file"
      accept=".pdf,.doc,.docx,.txt,.md"
      style="display: none"
      @change="handleUpload"
    />

    <!-- Loading -->
    <div v-if="loading" class="kb-loading">
      <ElIcon class="is-loading" :size="32"><Loading /></ElIcon>
    </div>

    <template v-else>
      <!-- Search -->
      <div class="kb-search">
        <ElInput
          v-model="search"
          placeholder="搜索文档…"
          :prefix-icon="Search"
          clearable
          style="max-width: 360px"
        />
      </div>

      <!-- RAG Status -->
      <div class="kb-status">
        <span class="kb-status__dot" />
        <span class="kb-status__text">RAG Pipeline 运行正常</span>
        <span class="kb-status__stats">
          {{ stats ? `${stats.total_documents} 文档 · ${stats.total_chunks} 分块` : '加载中…' }}
        </span>
      </div>

      <!-- RAG Query Section -->
      <div class="kb-query">
        <div class="kb-query__title">智能问答</div>
        <p class="kb-query__desc">基于知识库的 RAG 检索问答，输入问题获取 AI 回答</p>
        <div class="kb-query__input-row">
          <ElInput
            v-model="ragQuery"
            placeholder="输入问题，如：蓝桥杯竞赛的参赛经验有哪些？"
            @keydown.enter="handleRagQuery"
          />
          <ElButton type="primary" :loading="ragLoading" :disabled="!ragQuery.trim()" @click="handleRagQuery">
            {{ ragLoading ? '查询中…' : 'AI 问答' }}
          </ElButton>
          <ElButton :loading="ragLoading" :disabled="!ragQuery.trim()" @click="handleRagSearch">
            语义搜索
          </ElButton>
        </div>

        <!-- RAG Answer -->
        <div v-if="ragAnswer" class="kb-query__answer">
          <div class="kb-query__answer-label">AI 回答</div>
          <div class="kb-query__answer-text">{{ ragAnswer }}</div>
        </div>

        <!-- RAG Search Results -->
        <div v-if="ragResults && ragResults.length > 0" class="kb-query__results">
          <div class="kb-query__results-label">匹配到 {{ ragResults.length }} 条相关片段</div>
          <div class="kb-query__results-list">
            <div v-for="(r, i) in ragResults" :key="i" class="kb-result-item">
              <div class="kb-result-item__content">{{ r.content }}</div>
              <div class="kb-result-item__meta">
                <span v-if="r.score != null" class="kb-result-item__score">
                  相似度: {{ (r.score * 100).toFixed(1) }}%
                </span>
                <span v-if="r.metadata?.filename" class="kb-result-item__source">
                  来源: {{ r.metadata.filename }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div v-if="ragResults && ragResults.length === 0 && !ragLoading && !ragAnswer" class="kb-query__empty">
          未找到相关结果
        </div>
      </div>

      <!-- Document List -->
      <div v-if="filtered.length === 0" class="kb-empty">
        <ElEmpty description="暂无文档">
          <template #image>
            <ElIcon :size="48" color="var(--art-gray-400)"><Document /></ElIcon>
          </template>
        </ElEmpty>
      </div>

      <div v-else class="kb-docs-grid">
        <div
          v-for="(doc, i) in filtered"
          :key="doc.filename"
          class="kb-doc-card"
        >
          <div class="kb-doc-card__header">
            <div class="kb-doc-card__icon" :style="{ color: typeColor(doc.filename) }">
              <ElIcon :size="20"><Document /></ElIcon>
            </div>
            <div class="kb-doc-card__info">
              <div class="kb-doc-card__name">{{ doc.filename }}</div>
              <div class="kb-doc-card__meta">
                <ElTag size="small" effect="plain" :style="{ color: typeColor(doc.filename) }">
                  .{{ getExt(doc.filename) }}
                </ElTag>
                <span class="kb-doc-card__chunks">{{ doc.chunk_count }} 分块</span>
              </div>
            </div>
          </div>
          <div class="kb-doc-card__footer">
            <span class="kb-doc-card__date">
              {{ doc.created_at ? new Date(doc.created_at).toLocaleDateString('zh-CN') : '-' }}
            </span>
            <div class="kb-doc-card__actions">
              <ElButton text size="small" @click="handleViewChunks(doc.filename)" title="查看分块">
                <ElIcon><View /></ElIcon>
              </ElButton>
              <ElButton text size="small" type="danger" @click="handleDelete(doc.filename)" title="删除文档">
                <ElIcon><Delete /></ElIcon>
              </ElButton>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Text Ingest Dialog -->
    <ElDialog v-model="showTextIngest" title="文本录入知识库" width="560px" :close-on-click-modal="false">
      <ElInput
        v-model="textFilename"
        placeholder="文档名称（选填，如：竞赛经验分享）"
        style="margin-bottom: 12px"
      />
      <ElInput
        v-model="textContent"
        type="textarea"
        :rows="10"
        placeholder="粘贴或输入文本内容，系统将自动分块并嵌入向量数据库…"
        resize="vertical"
      />
      <template #footer>
        <ElButton @click="showTextIngest = false">取消</ElButton>
        <ElButton type="primary" :loading="ingesting" :disabled="!textContent.trim()" @click="handleTextIngest">
          {{ ingesting ? '录入中…' : '确认录入' }}
        </ElButton>
      </template>
    </ElDialog>

    <!-- Chunk Viewer Dialog -->
    <ElDialog v-model="showChunkViewer" title="文档分块详情" width="700px" :close-on-click-modal="false">
      <div v-if="chunkLoading" style="text-align: center; padding: 32px; color: var(--art-gray-500)">加载中...</div>
      <template v-else-if="viewingChunks">
        <div style="font-size: 12px; color: var(--art-gray-500); margin-bottom: 16px">
          文档: <strong style="color: var(--art-gray-800)">{{ viewingChunks.filename }}</strong>
          · 共 {{ viewingChunks.total }} 个分块
        </div>
        <div class="kb-chunks-list">
          <div v-for="(chunk, i) in viewingChunks.chunks" :key="chunk.id || i" class="kb-chunk-item">
            <div class="kb-chunk-item__header">
              <ElTag size="small" effect="dark" type="warning">#{{ i + 1 }}</ElTag>
              <span class="kb-chunk-item__id">ID: {{ chunk.id }}</span>
            </div>
            <div class="kb-chunk-item__content">{{ chunk.content }}</div>
          </div>
        </div>
      </template>
    </ElDialog>
  </section>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted } from 'vue'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { Loading, Search, Plus, Edit, Document, View, Delete } from '@element-plus/icons-vue'
  import { ragAPI } from '@/api/ssgl'
  import SSGLPageHeader from '@/components/ssgl/SSGLPageHeader.vue'
  import type { RAGDocument, RAGStats } from '@/types/ssgl'

  defineOptions({ name: 'SSGL_KnowledgeBase' })

  type RagResult = { content: string; metadata: Record<string, unknown>; score: number }

  const docs = ref<RAGDocument[]>([])
  const stats = ref<RAGStats | null>(null)
  const loading = ref(true)
  const search = ref('')
  const uploading = ref(false)
  const fileInputRef = ref<HTMLInputElement | null>(null)

  // RAG query
  const ragQuery = ref('')
  const ragResults = ref<RagResult[] | null>(null)
  const ragLoading = ref(false)
  const ragAnswer = ref<string | null>(null)

  // Text ingest
  const showTextIngest = ref(false)
  const textContent = ref('')
  const textFilename = ref('')
  const ingesting = ref(false)

  // Chunk viewer
  const showChunkViewer = ref(false)
  const viewingChunks = ref<{ filename: string; chunks: { id: number; content: string; metadata: unknown }[]; total: number } | null>(null)
  const chunkLoading = ref(false)

  const filtered = computed(() =>
    docs.value.filter(doc => !search.value || doc.filename.toLowerCase().includes(search.value.toLowerCase()))
  )

  onMounted(() => { fetchData() })

  async function fetchData() {
    loading.value = true
    try {
      const [docRes, statsRes] = await Promise.all([
        ragAPI.listDocuments(),
        ragAPI.getStats(),
      ])
      docs.value = docRes.documents || []
      stats.value = statsRes
    } catch (e) {
      console.error(e)
    } finally {
      loading.value = false
    }
  }

  function getExt(filename: string) {
    return filename.split('.').pop()?.toLowerCase() || ''
  }

  function typeColor(filename: string) {
    const ext = getExt(filename)
    const map: Record<string, string> = { pdf: '#dc2626', doc: '#0d9488', docx: '#0d9488', md: '#7c3aed', txt: '#6b7280' }
    return map[ext] || '#6b7280'
  }

  async function handleUpload(e: Event) {
    const input = e.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return
    uploading.value = true
    try {
      await ragAPI.uploadFile(file)
      fetchData()
    } catch (err) {
      ElMessage.error('上传失败')
    } finally {
      uploading.value = false
      if (fileInputRef.value) fileInputRef.value.value = ''
    }
  }

  async function handleDelete(filename: string) {
    try {
      await ElMessageBox.confirm(`确认删除文档「${filename}」？所有相关分块将被永久移除。`, '确认删除', {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning',
      })
      await ragAPI.deleteDocument(filename)
      docs.value = docs.value.filter(d => d.filename !== filename)
      if (stats.value) {
        stats.value = { ...stats.value, total_documents: stats.value.total_documents - 1 }
      }
      ElMessage.success('已删除')
    } catch {
      // cancelled or error
    }
  }

  async function handleViewChunks(filename: string) {
    showChunkViewer.value = true
    chunkLoading.value = true
    viewingChunks.value = null
    try {
      viewingChunks.value = await ragAPI.getDocumentChunks(filename)
    } catch {
      ElMessage.error('加载分块失败')
    } finally {
      chunkLoading.value = false
    }
  }

  async function handleRagQuery() {
    if (!ragQuery.value.trim()) return
    ragLoading.value = true
    ragResults.value = null
    ragAnswer.value = null
    try {
      const res = await ragAPI.query(ragQuery.value)
      ragAnswer.value = res.answer || null
      ragResults.value = (res.sources || []) as RagResult[]
    } catch {
      ragAnswer.value = '查询失败，请稍后重试'
    } finally {
      ragLoading.value = false
    }
  }

  async function handleRagSearch() {
    if (!ragQuery.value.trim()) return
    ragLoading.value = true
    ragResults.value = null
    ragAnswer.value = null
    try {
      const res = await ragAPI.search(ragQuery.value)
      ragResults.value = (res.results || []) as RagResult[]
    } catch {
      // ignore
    } finally {
      ragLoading.value = false
    }
  }

  async function handleTextIngest() {
    if (!textContent.value.trim()) return
    ingesting.value = true
    try {
      await ragAPI.ingest(textContent.value, textFilename.value ? { filename: textFilename.value } : undefined)
      showTextIngest.value = false
      textContent.value = ''
      textFilename.value = ''
      fetchData()
      ElMessage.success('录入成功')
    } catch {
      ElMessage.error('录入失败')
    } finally {
      ingesting.value = false
    }
  }
</script>

<style scoped lang="scss">
  .kb-page {
    overflow-y: auto;
  }

  .kb-header-actions {
    display: flex;
    gap: 8px;
  }

  .kb-loading {
    display: flex;
    height: 200px;
    align-items: center;
    justify-content: center;
    color: var(--el-color-primary);
  }

  .kb-search {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 20px;
  }

  .kb-status {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 14px;
    border: 1px solid var(--el-border-color-light);
    border-radius: 12px;
    background: var(--el-bg-color);
    margin-bottom: 16px;

    &__dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #16a34a;
      box-shadow: 0 0 0 4px rgba(22, 163, 74, 0.15);
    }

    &__text {
      font-size: 12px;
      color: var(--art-gray-700);
      font-weight: 600;
    }

    &__stats {
      font-size: 11px;
      color: var(--art-gray-500);
      font-family: var(--el-font-family-monospace, monospace);
    }
  }

  .kb-query {
    padding: 20px;
    border: 1px solid var(--el-border-color-light);
    border-radius: 12px;
    background: var(--el-bg-color);
    margin-bottom: 20px;

    &__title {
      font-size: 14px;
      font-weight: 700;
      color: var(--art-gray-800);
      margin-bottom: 4px;
    }

    &__desc {
      font-size: 12px;
      color: var(--art-gray-500);
      margin: 0 0 12px;
    }

    &__input-row {
      display: flex;
      gap: 8px;
      margin-bottom: 12px;
    }

    &__answer {
      padding: 16px;
      border-radius: 10px;
      background: rgba(217, 119, 6, 0.08);
      border: 1px solid rgba(217, 119, 6, 0.2);
      margin-bottom: 12px;
    }

    &__answer-label {
      font-size: 11px;
      font-weight: 700;
      color: #d97706;
      margin-bottom: 8px;
      letter-spacing: 0.05em;
    }

    &__answer-text {
      font-size: 13px;
      color: var(--art-gray-800);
      line-height: 1.7;
      white-space: pre-wrap;
    }

    &__results {
      margin-top: 8px;
    }

    &__results-label {
      font-size: 11px;
      font-weight: 700;
      color: var(--art-gray-500);
      margin-bottom: 8px;
    }

    &__results-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    &__empty {
      text-align: center;
      padding: 16px;
      color: var(--art-gray-500);
      font-size: 13px;
    }
  }

  .kb-result-item {
    padding: 12px;
    border-radius: 8px;
    background: var(--el-fill-color-light);
    border: 1px solid var(--el-border-color-lighter);

    &__content {
      font-size: 12px;
      color: var(--art-gray-800);
      line-height: 1.6;
      margin-bottom: 6px;
    }

    &__meta {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    &__score {
      font-size: 10px;
      font-family: var(--el-font-family-monospace, monospace);
      color: #16a34a;
      font-weight: 600;
    }

    &__source {
      font-size: 10px;
      color: var(--art-gray-500);
    }
  }

  .kb-empty {
    padding: 40px 0;
  }

  .kb-docs-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 12px;
  }

  .kb-doc-card {
    padding: 18px;
    border: 1px solid var(--el-border-color-light);
    border-radius: 12px;
    background: var(--el-bg-color);
    transition: all 0.2s;

    &:hover {
      transform: translateY(-2px);
      box-shadow: var(--el-box-shadow-light);
    }

    &__header {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 12px;
    }

    &__icon {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: var(--el-fill-color-light);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      border: 1px solid var(--el-border-color-lighter);
    }

    &__info {
      flex: 1;
      min-width: 0;
    }

    &__name {
      font-size: 13px;
      font-weight: 600;
      color: var(--art-gray-800);
      line-height: 1.4;
      margin-bottom: 4px;
      word-break: break-all;
    }

    &__meta {
      display: flex;
      gap: 6px;
      align-items: center;
    }

    &__chunks {
      font-size: 11px;
      color: var(--art-gray-500);
    }

    &__footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-top: 10px;
      border-top: 1px solid var(--el-border-color-lighter);
    }

    &__date {
      font-size: 11px;
      color: var(--art-gray-500);
    }

    &__actions {
      display: flex;
      gap: 4px;
    }
  }

  .kb-chunks-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
    max-height: 60vh;
    overflow-y: auto;
  }

  .kb-chunk-item {
    padding: 14px;
    border-radius: 8px;
    background: var(--el-fill-color-light);
    border: 1px solid var(--el-border-color-lighter);

    &__header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }

    &__id {
      font-size: 10px;
      color: var(--art-gray-500);
      font-family: var(--el-font-family-monospace, monospace);
    }

    &__content {
      font-size: 13px;
      color: var(--art-gray-800);
      line-height: 1.7;
      white-space: pre-wrap;
      word-break: break-word;
    }
  }
</style>
