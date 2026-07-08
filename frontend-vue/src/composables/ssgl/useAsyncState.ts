export function useAsyncState<T>(loader: () => Promise<T>) {
  const data = shallowRef<T | null>(null)
  const loading = ref(false)
  const error = ref<unknown>(null)

  async function execute() {
    loading.value = true
    error.value = null
    try {
      data.value = await loader()
      return data.value
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  return { data, loading, error, execute }
}
