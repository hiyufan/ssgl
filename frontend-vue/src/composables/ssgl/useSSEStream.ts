export function useSSEStream() {
  const output = ref('')
  const loading = ref(false)
  const error = ref('')

  function reset() {
    output.value = ''
    error.value = ''
    loading.value = false
  }

  async function run(handler: (events: {
    onChunk: (text: string) => void
    onDone: () => void
    onError: (message: string) => void
  }) => Promise<void>) {
    reset()
    loading.value = true
    await handler({
      onChunk: (text) => {
        output.value += text
      },
      onDone: () => {
        loading.value = false
      },
      onError: (message) => {
        error.value = message
        loading.value = false
      }
    })
  }

  return { output, loading, error, reset, run }
}
