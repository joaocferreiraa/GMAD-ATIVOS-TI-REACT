import { useState } from 'react'
import Card from '../../components/ui/Card/Card'
import Gallery from '../../components/unidades/Gallery/Gallery'
import Lightbox from '../../components/unidades/Lightbox/Lightbox'
import { MADVILLE_IMAGES, CURITIBA_IMAGES } from './galleryImages'
import styles from './UnidadesPage.module.css'

// Tela "Nossas unidades" — conteúdo 100% estático no sistema original
// (galeria de fotos + endereços/mapas de 2 unidades), sem CRUD, sem relação
// com o cadastro de Ativos.
export default function UnidadesPage() {
  const [lightboxImage, setLightboxImage] = useState(null)

  return (
    <div>
      <div className={styles.heading}>
        <h2>Nossas unidades</h2>
        <p>Conheça elas.</p>
      </div>

      <Card className={styles.galleryCard}>
        <h3>GMAD Madville — Loja, CD e Soluções</h3>
        <Gallery images={MADVILLE_IMAGES} onOpen={setLightboxImage} />
      </Card>

      <Card className={styles.galleryCard}>
        <h3>GMAD Curitiba</h3>
        <Gallery images={CURITIBA_IMAGES} onOpen={setLightboxImage} />
      </Card>

      <div className={styles.locationsGrid}>
        <div className={styles.locationCard}>
          <span className={`${styles.locTag} ${styles.locTagMadville}`}>GMAD Madville</span>
          <h3>Nossa localização</h3>
          <p>Rua Anita Garibaldi, 2417, Joinville – SC</p>
          <div className={styles.mapEmbed}>
            <iframe
              src="https://www.google.com/maps?q=Rua+Anita+Garibaldi,+2417,+Joinville+-+SC&output=embed"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Localização GMAD Madville"
            />
          </div>
        </div>
        <div className={styles.locationCard}>
          <span className={`${styles.locTag} ${styles.locTagCuritiba}`}>GMAD Curitiba</span>
          <h3>Nossa localização</h3>
          <p>BR 116, nº 19231 - Pinheirinho, Curitiba – PR, 81690-400</p>
          <div className={styles.mapEmbed}>
            <iframe
              src="https://www.google.com/maps?q=BR+116+19231,+Pinheirinho,+Curitiba+-+PR,+81690-400&output=embed"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Localização GMAD Curitiba"
            />
          </div>
        </div>
      </div>

      <Lightbox
        open={!!lightboxImage}
        image={lightboxImage}
        onClose={() => setLightboxImage(null)}
      />
    </div>
  )
}
