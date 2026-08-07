import { useState } from 'react'

// Estado de UI repetido nos módulos CRUD com ficha de visualização + modal
// de formulário + exclusão com confirmação (Ativos, Contatos, Estoque,
// Instaladores, Scripts): abrir/fechar ficha, abrir/fechar formulário (novo
// ou editando), voltar para a ficha depois de salvar uma edição feita a
// partir dela, e o fluxo de exclusão (via tabela, via formulário ou via
// confirmação).
export function useCrudPanelState({ list, uidParam, mutations }) {
  const { create, update, remove } = mutations

  const [viewingUid, setViewingUid] = useState(null)
  const [formItem, setFormItem] = useState(undefined) // undefined = fechado, null = novo, objeto = editando
  const [returnToViewUid, setReturnToViewUid] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)

  const viewingItem = viewingUid ? list.find((item) => item.uid === viewingUid) : null

  function openNew() {
    setFormItem(null)
  }

  function openView(uid) {
    setViewingUid(uid)
  }

  function closeView() {
    setViewingUid(null)
  }

  function openEdit(item) {
    setReturnToViewUid(null)
    setFormItem(item)
  }

  function openEditFromView() {
    setReturnToViewUid(viewingUid)
    setViewingUid(null)
    setFormItem(viewingItem)
  }

  function closeForm() {
    const ret = returnToViewUid
    setReturnToViewUid(null)
    setFormItem(undefined)
    if (ret) setViewingUid(ret)
  }

  function handleSaveForm(record, isEdit) {
    const ret = isEdit ? returnToViewUid : null
    if (isEdit) {
      update.mutate(
        { [uidParam]: formItem.uid, record },
        {
          onSuccess: () => {
            setReturnToViewUid(null)
            setFormItem(undefined)
            if (ret) setViewingUid(ret)
          },
        },
      )
    } else {
      create.mutate(record, {
        onSuccess: () => {
          setFormItem(undefined)
        },
      })
    }
  }

  function requestDelete(item) {
    setPendingDelete(item)
  }

  function handleDeleteFromForm(item) {
    setReturnToViewUid(null)
    setFormItem(undefined)
    setPendingDelete(item)
  }

  function cancelDelete() {
    setPendingDelete(null)
  }

  function handleConfirmDelete() {
    remove.mutate(pendingDelete, { onSuccess: () => setPendingDelete(null) })
  }

  return {
    viewingUid,
    viewingItem,
    formItem,
    pendingDelete,
    openNew,
    openView,
    closeView,
    openEdit,
    openEditFromView,
    closeForm,
    handleSaveForm,
    requestDelete,
    handleDeleteFromForm,
    cancelDelete,
    handleConfirmDelete,
  }
}
