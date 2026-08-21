import { useRef, useState } from 'react'
import Modal from '../../../components/ui/Modal/Modal'
import Button from '../../../components/ui/Button/Button'
import Input from '../../../components/ui/Input/Input'
import Select from '../../../components/ui/Select/Select'
import FormField, { FormGrid } from '../../../components/ui/FormField/FormField'
import { AvatarSilhuetaIcon, TrashIcon } from '../../../components/ui/Icon/icons'
import { useAuth } from '../../../hooks/auth/useAuth'
import { useToast } from '../../../hooks/useToast'
import { usePerfil, useSalvarFotoPerfil } from '../../../hooks/data/usePerfil'
import { useAssets } from '../../../hooks/data/useAssets'
import { useContatos } from '../../../hooks/data/useContatos'
import { getDepartamentoOptions } from '../../../utils/departamentos'
import { reduzirImagemParaAvatar } from '../../../utils/imagem'
import { nameFromEmail } from '../../../utils/formatters'
import styles from './ProfileModal.module.css'

// Meu perfil: foto, setor e cargo.
//
// Os três campos vêm de lugares diferentes por necessidade (ver usePerfil):
// setor e cargo no user_metadata, foto no kv_store. O formulário esconde
// isso — a pessoa edita uma coisa só e salva uma vez.
//
// A foto é reduzida a 128px NO NAVEGADOR antes de sair daqui
// (utils/imagem.js). Mandar o arquivo original pro banco seria trocar um
// avatar de 26px por megabytes de JPEG de celular.
// MONTADO SÓ QUANDO ABERTO (ver Topbar): sem isso, o estado local sobreviveria
// entre uma abertura e outra e o rascunho abandonado voltaria na próxima vez.
// Montar por abertura também dispensa um efeito de "recarregar ao abrir", que
// a regra react-hooks/set-state-in-effect proíbe.
export default function ProfileModal({ open, onClose }) {
  const { user, updateProfile } = useAuth()
  const { showToast } = useToast()
  const perfil = usePerfil()
  const salvarFoto = useSalvarFotoPerfil()

  // As duas listas que alimentam os departamentos existentes — mesma fonte
  // que os formulários de Ativos e Contatos usam, pro setor daqui não virar
  // um vocabulário paralelo.
  const { data: assets } = useAssets()
  const { data: contatos } = useContatos()
  const departamentos = getDepartamentoOptions(assets ?? [], contatos ?? [])

  const arquivoRef = useRef(null)
  // `undefined` = não mexeu na foto; `null` = pediu pra remover; string = nova.
  //
  // Não copio perfil.foto pro estado, e isso importa: a foto vem de uma busca
  // no banco, enquanto setor e cargo já chegam na sessão. Copiando na
  // abertura, um modal aberto antes de a busca responder nasceria com foto
  // nula — e salvar apagaria a foto que a pessoa tinha. Com o "não mexeu"
  // explícito, o que não foi tocado não é gravado.
  const [foto, setFoto] = useState(undefined)
  const [setor, setSetor] = useState(perfil.setor)
  const [cargo, setCargo] = useState(perfil.cargo)
  const [salvando, setSalvando] = useState(false)

  const fotoExibida = foto === undefined ? perfil.foto : foto
  const fotoMudou = foto !== undefined && foto !== perfil.foto

  async function escolherArquivo(event) {
    const file = event.target.files?.[0]
    // Limpa o input ANTES de processar: sem isso, escolher o mesmo arquivo
    // duas vezes seguidas não dispara change na segunda.
    event.target.value = ''
    if (!file) return
    try {
      setFoto(await reduzirImagemParaAvatar(file))
    } catch (e) {
      showToast(e.message, 'danger')
    }
  }

  async function salvar() {
    setSalvando(true)
    try {
      // Duas gravações porque são dois destinos. A do metadata vem primeiro:
      // se ela falhar, nada foi alterado em lugar nenhum.
      const { error } = await updateProfile({ setor: setor.trim(), cargo: cargo.trim() })
      if (error) throw error
      if (fotoMudou) await salvarFoto.mutateAsync(foto)
      showToast('Perfil atualizado.')
      onClose()
    } catch (e) {
      showToast(e.message || 'Não foi possível salvar o perfil.', 'danger')
    } finally {
      setSalvando(false)
    }
  }

  const nome = nameFromEmail(user?.email)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Meu perfil"
      subtitle={user?.email}
      maxWidth={460}
      footer={
        <div className={styles.acoes}>
          <Button onClick={onClose} disabled={salvando}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={salvar} disabled={salvando}>
            {salvando ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      }
    >
      <div className={styles.fotoBloco}>
        <div className={styles.previa}>
          {fotoExibida ? (
            <img src={fotoExibida} alt={`Foto de ${nome}`} />
          ) : (
            <AvatarSilhuetaIcon className={styles.previaSilhueta} />
          )}
        </div>
        <div className={styles.fotoAcoes}>
          {/* O <input file> fica escondido e é acionado pelo botão: o
              controle nativo não aceita estilo e destoaria de tudo em volta. */}
          <input
            ref={arquivoRef}
            type="file"
            accept="image/*"
            onChange={escolherArquivo}
            hidden
          />
          <Button size="sm" onClick={() => arquivoRef.current?.click()}>
            {fotoExibida ? 'Trocar foto' : 'Escolher foto'}
          </Button>
          {fotoExibida && (
            <Button size="sm" variant="dangerGhost" onClick={() => setFoto(null)}>
              <TrashIcon width={14} height={14} />
              Remover
            </Button>
          )}
          <span className={styles.dica}>Recortada no centro e reduzida a 128px.</span>
        </div>
      </div>

      <FormGrid>
        <FormField label="Setor / departamento" full>
          <Select
            value={setor}
            onChange={setSetor}
            options={departamentos.map((d) => ({ value: d, label: d }))}
            placeholder="Selecione o setor"
          />
        </FormField>

        <FormField label="Cargo" htmlFor="perfil_cargo" full>
          <Input
            id="perfil_cargo"
            value={cargo}
            onChange={(e) => setCargo(e.target.value)}
            placeholder="Ex.: Analista de TI"
            maxLength={60}
          />
        </FormField>
      </FormGrid>
    </Modal>
  )
}
