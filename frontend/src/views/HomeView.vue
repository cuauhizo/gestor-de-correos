<template>
  <div>
    <h1>Bienvenido al Creador de Correos</h1>
    <button @click="createNewEmail">Crear Nuevo Correo Editable</button>
    <p v-if="newEmailUrl">Enlace de edición: <a :href="newEmailUrl" target="_blank">{{ newEmailUrl }}</a></p>
  </div>
</template>

<!-- frontend/src/views/HomeView.vue -->
<script setup>
import { ref } from 'vue';
import axios from 'axios';
import { useRouter } from 'vue-router';

const router = useRouter();
const newEmailUrl = ref('');

const createNewEmail = async () => {
  console.log('--- createNewEmail function called ---');
  try {
    const response = await axios.post('http://localhost:3000/api/emails-editable', {
      template_id: 1, // Asegúrate de que este ID coincida con el ID del template que actualizaste
      initial_content: {
        titulo_principal: 'TOMA LA RINDE HONORES AL FÚTBOL CALLEJERO (Editable)',
        parrafo_principal: 'Nike lanza Toma El Juego, una plataforma global de fútbol callejero para jóvenes que fomenta el juego a través de torneos vecinales. Puedes editar este párrafo. El primer capítulo fue Toma LA, en el que jóvenes de ocho vecindarios de la zona participaron en un torneo al que asistieron Vini Jr., Hirving Lozano y Rayssa Leal, Atletas Nike de nuestro territorio, para inspirar a las futuras estrellas del fútbol.',
        titulo_columna_izquierda: 'PLATICAMOS CON ALE OROZCO, ATLETA NIKE Y LEYENDA DE LOS CLAVADOS (Editable)',
        parrafo_columna_izquierda: 'Desde anécdotas de su infancia hasta el podio olímpico, en el marco del Campeonato Mundial de Deportes Acuáticos, Ale nos cuenta cómo los clavados transformaron su vida, sus rituales de entrenamiento y lo que significa soñar en grande. Nike, impulsa con orgullo la historia de la medallista que es puro poder y ejemplo de perseverancia. ¡Gracias por ser inspiración, Ale!',
        enlace_columna_izquierda: 'https://ejemplo.com/entrevista-ale-orozco',
        titulo_columna_derecha: 'WORLD AQUATICS 2025: EL AGUA REÚNE A LOS MEJORES DEL MUNDO (Editable)',
        parrafo_columna_derecha: 'Singapur es sede del Campeonato Mundial de Deportes Acuáticos, donde los mejores atletas compiten en las categorías de clavados, natación, natación artística, natación en aguas abiertas y waterpolo. Entre las y los mexicanos que están brillando en esta competencia está la clavadista y Atleta Nike, Gaby Agúndez, quien conquistó la medalla de plata en plataforma sincronizada junto a Alejandra Estudillo. Sigue esta gran competencia que durará hasta el 3 de agosto.',
        titulo_inferior: 'INGLATERRA, BICAMPEONAS DE EUROPA (Editable)',
        parrafo_inferior: 'Las Lionesses reafirmaron su lugar en la historia al conquistar su segunda Eurocopa Femenina consecutiva. Chloe Kelly, Atleta Nike, tomó los reflectores con una asistencia y el penal de la victoria. IIOME: así celebra Nike a las mejores de Europa. Puedes ver el video aquí.',
        enlace_inferior: 'https://www.instagram.com/reel/DMnzJZAP6P0/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA%3D%3D',
        enlace_encuesta: 'https://forms.office.com/r/6TEwtvWdAF',
        titulo_agenda_deportiva: 'AGENDA DEPORTIVA (Editable)',
        titulo_pumas: 'PUMAS INICIA EN LA LEAGUES CUP 2025 (Editable)',
        parrafo_pumas: 'Arrancó la nueva edición del torneo que enfrenta a los 18 mejores clubes de la MLS y a todos los equipos de la Liga MX. En la primera fase, Pumas se enfrenta a Orlando City, Atlanta United e Inter Miami. ¡Sigue esta competencia hasta el 31 de agosto!',
        titulo_nfl: 'REGRESA LA EMOCIÓN DE LA NFL A LAS CANCHAS (Editable)',
        parrafo_nfl: 'El fútbol americano profesional vuelve el 31 de julio con el kickoff de la pretemporada: Lions vs Chargers. La cuenta regresiva para la semana 1 está en marcha, y Nike estará en cada jugada como parte de su asociación con la liga deportiva.'
      }
    });
    const { uuid } = response.data;
    newEmailUrl.value = `${window.location.origin}/editar-correo/${uuid}`;
  } catch (error) {
    console.error('Error al crear nuevo correo editable:', error);
    alert('Error al crear correo. Revisa la consola.');
  }
};
</script>