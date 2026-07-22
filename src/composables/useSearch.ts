import { ref } from 'vue'

const query = ref('')
// Bumped on explicit submit from any search bar so the search page can refresh
// even when the submitted URL is unchanged.
const searchSubmitTick = ref(0)

export function useSearch() {
  function submitTextSearch() {
    searchSubmitTick.value++
  }

  return {
    query,
    searchSubmitTick,
    submitTextSearch,
  }
}
