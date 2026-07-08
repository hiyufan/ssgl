export function usePagination(pageSize = 20) {
  const page = ref(1)
  const total = ref(0)

  const params = computed(() => ({
    page: String(page.value),
    page_size: String(pageSize)
  }))

  function setTotal(value: number) {
    total.value = value
  }

  function reset() {
    page.value = 1
    total.value = 0
  }

  return { page, total, pageSize, params, setTotal, reset }
}
