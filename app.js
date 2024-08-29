require('dotenv').config()

// Configuración de Firebase
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.FIREBASE_DATABASE_URL,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

firebaseConfig();
// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();








let lastScrollTop = 0;

// Aplicación Vue.js
new Vue({
  el: '#app',
  data: {
    email: '',
    password: '',
    nickname: '',
    isRegistering: false,
    isLoggedIn: false,
    userEmail: '',
    userId: '',
    userNickname: '',
    allPosts: [],
    myPosts: [],
    newPostTitle: '',
    newPostContent: '',
    currentSection: 'feed',
    editingPost: null,
    settingsOpen: false,
    showNavbar: true,
    isPostOpen: false,
    selectedPost: {},
    newPostImage: null, // Para almacenar la imagen subida
    newPostImageUrl: '', // Para almacenar la URL de la imagen
    newPostImageUrl: '', 
    isUploading: false, // Rastrea si la imagen se está subiendo
    uploadProgress: '', // Almacena el progreso de la subida
    uploadStatusMessage: '', // Almacena el mensaje de estado de la subida
    selectedPost: null,
    comments: {}, // Inicializar como un objeto vacío
    newCommentContent: '',
    newReplyContent: '',
    replyingToCommentId: null,
    notifications: [],              // Para almacenar las notificaciones
    unreadNotificationsCount: 0,    // Contador de notificaciones no leídas
    showingNotifications: false,    // Controla la visibilidad del menú de notificaciones
    premiumPosts: [],  // Arreglo para almacenar las publicaciones premium
    isPremium: false,  // Indicador para marcar si un post es premium
    canPublish: false,
    commentMenuOpen: null,  // Para almacenar el ID del comentario con el menú abierto
    searchQuery: '', // Para la barra de búsqueda
    userData: {}, // Inicializar como un objeto vacío
    showCreatePostPopup: false,  // Variable para controlar la visibilidad del popup de crear post
    creatorPosts: [], // Almacena los posts del creador seleccionado
    selectedUserData: {}, // Almacena los datos del creador seleccionado
    selectedUserNickname: '', // Almacena el nickname del creador seleccionado
    isAnnouncementShown: false, // Para rastrear si el anuncio se ha mostrado
    showAnnouncementModal: false, // Add this line
    userOnline: false,  // Agregar esta línea
    lastUpdateDate: '25 de agosto de 2024',  // Set the last update date here
    creatorSearchQuery: '',
    showAnnouncementButton: true, // Controla la visibilidad del botón
    inactivityTimeout: null, // Para almacenar el timeout de inactividad
    inactivityTimeLimit: 180000 , //  30 segundos en milisegundos
    isChatOpen: false,
    chatWithNickname: '',
    chatWithUserId: '',
    chatMessages: [],
    newMessage: '',
    isNewGoogleUser: false, // Para manejar si el usuario necesita ingresar un nickname después de Google Sign-In
    createPostKey: 0, // Añade esta propiedad
    userChats: [],  // Asegúrate de inicializarlo como un array vacío
    currentChatId: null, // ID de la conversación actual
    hasCompletedShortenerSteps: false, // Asegúrate de que esté inicializado como falso
    showCompletionLink: false, // Oculta el enlace inicialmente
    showRulesModal: false,
    verificationRequests: {},
    isAdmin: false,  // Inicia como falso; actualizarás esto según tu lógica
    otherUserId: null,
    otherUserNickname: '',
    messages: [],
    newMessage: '',
    unreadMessagesCount: 0,
    chats: [],
    activePostMenu: null,
    showReportModalFlag: false,
    reportedPost: null,
    reportReason: '',
    reportComment: '',
    reportImage: null,
    reports: [],
    isSidebarOpen: false,
    userSearchQuery: '',
    users: [], // Almacena todos los usuarios
    filteredUsers: [], // Para almacenar los usuarios filtrados
    selectedUser: null // Almacena el usuario seleccionado
    
    
  },
  computed: {

      // Cambia el nombre a algo único
      filteredUserList() {
        if (!this.userSearchQuery.trim()) {
          return [];
        }
        const filtered = this.users.filter(user => 
          user.nickname.toLowerCase().includes(this.userSearchQuery.toLowerCase())
        );
        console.log('Usuarios filtrados:', filtered); // Verifica los usuarios filtrados
        return filtered;
      },



    filteredCreatorPosts() {
      if (!this.creatorSearchQuery.trim()) {
          return this.creatorPosts;
      }
      return this.creatorPosts.filter(post => 
          post.title.toLowerCase().includes(this.creatorSearchQuery.toLowerCase())
      );
  },


    // Mantén el método que ya tienes
    sortedPremiumPosts() {
      const seenKeys = new Set();
      return Object.values(this.premiumPosts)
        .map(post => {
          if (!post.uniqueKey) {
            post.uniqueKey = `${post.authorId}-${post.id}-premium-${Math.random().toString(36).substring(2, 15)}`;
          }
          return post;
        })
        .filter(post => {
          if (seenKeys.has(post.uniqueKey)) {
            return false;
          }
          seenKeys.add(post.uniqueKey);
          return true;
        })
        .sort((a, b) => {
          const aScore = (a.likeCount || 0) + (a.viewsCount || 0);
          const bScore = (b.likeCount || 0) + (b.viewsCount || 0);
          if (bScore === aScore) {
            return a.timestamp - b.timestamp; // Usar timestamp como criterio secundario
          }
          return bScore - aScore; // Ordenar por score
        });
  },  
    



    // Agrega el nuevo método para filtrar los posts
    filteredPosts() {
        if (!this.searchQuery.trim()) {
            return this.myPosts;
        }
        return this.myPosts.filter(post => 
            post.title.toLowerCase().includes(this.searchQuery.toLowerCase())
        );
    }
},

watch: {
  isPremium(newVal) {
      if (newVal) {
          this.canPublish = false;
          this.startCompletionTimer();
      } else {
          this.canPublish = true;
          this.hasCompletedShortenerSteps = false; // Reinicia si desmarca como premium
      }
  }
},





  
  
  methods: {


      // Método para cargar usuarios desde Firebase
      loadUsers() {
        firebase.database().ref('users').once('value', snapshot => {
          this.users = [];
          snapshot.forEach(childSnapshot => {
            const user = childSnapshot.val();
            user.id = childSnapshot.key;
            this.users.push(user);
          });
          console.log('Usuarios cargados:', this.users);
        }).catch(error => {
          console.error('Error al cargar los usuarios:', error);
          alert('Hubo un error al cargar los usuarios. Inténtalo de nuevo más tarde.');
        });
      },

  // Método para ver el perfil del usuario seleccionado
  viewUserProfile(userId) {
    firebase.database().ref(`users/${userId}`).once('value', snapshot => {
      this.selectedUser = snapshot.val();
      this.selectedUser.id = userId;
      this.selectedUserNickname = this.selectedUser.nickname;
      this.selectedUserData = this.selectedUser;  // Asegúrate de que los datos del usuario se asignen correctamente
      this.currentSection = 'creatorProfile'; // Cambiar a la sección del perfil del creador
    }).catch(error => {
      console.error('Error al cargar el perfil del usuario:', error);
    });
  },



    



    toggleDarkMode() {
      this.isDarkMode = !this.isDarkMode;
      document.body.classList.toggle('dark-mode', this.isDarkMode);
      localStorage.setItem('darkMode', this.isDarkMode);
    },

    toggleMobileMenu() {
      this.isMobileMenuOpen = !this.isMobileMenuOpen;
    },

    togglePostMenu(postId) {
      this.activePostMenu = this.activePostMenu === postId ? null : postId;
    },
  
    showReportModal(post) {
      this.reportedPost = post;
      this.showReportModalFlag = true;
      this.activePostMenu = null;
    },
  
    closeReportModal() {
      this.showReportModalFlag = false;
      this.reportedPost = null;
      this.reportReason = '';
      this.reportComment = '';
      this.reportImage = null;
    },
  
    handleReportImage(event) {
      this.reportImage = event.target.files[0];
    },
  
    submitReport() {
      if (!this.reportReason) {
        alert('Por favor, seleccione una razón para el reporte.');
        return;
      }
    
      const reportData = {
        postId: this.reportedPost.id,
        postTitle: this.reportedPost.title,
        reason: this.reportReason,
        comment: this.reportComment,
        reporterId: this.userId,
        reporterNickname: this.userNickname, // Añadimos el nickname del reportador
        creatorId: this.reportedPost.authorId,
        timestamp: Date.now()
      };
    
      if (this.reportImage) {
        const storageRef = firebase.storage().ref();
        const imageRef = storageRef.child(`report-images/${Date.now()}_${this.reportImage.name}`);
        
        imageRef.put(this.reportImage).then(snapshot => {
          return snapshot.ref.getDownloadURL();
        }).then(downloadURL => {
          reportData.imageUrl = downloadURL;
          this.saveReportToDatabase(reportData);
        });
      } else {
        this.saveReportToDatabase(reportData);
      }
    },
  
    saveReportToDatabase(reportData) {
      const newReportKey = database.ref().child('reports').push().key;
      const updates = {};
      updates['/reports/' + newReportKey] = reportData;
    
      database.ref().update(updates).then(() => {
        alert('Reporte enviado con éxito.');
        this.closeReportModal();
      }).catch(error => {
        console.error('Error al enviar el reporte:', error);
        alert('Hubo un error al enviar el reporte. Por favor, intente de nuevo.');
      });
    },
  
    loadReports() {
      if (this.isAdmin) {
        console.log("Cargando reportes...");
        database.ref('reports').on('value', snapshot => {
          this.reports = [];
          snapshot.forEach(childSnapshot => {
            const report = childSnapshot.val();
            report.id = childSnapshot.key;
            this.reports.push(report);
          });
          console.log("Reportes cargados:", this.reports);
        }, error => {
          console.error("Error al cargar reportes:", error);
        });
      } else {
        console.log("Usuario no es admin, no se cargan reportes");
      }
    },
  

    viewReportedPost(postId) {
      // Implementar lógica para ver el post reportado
      // Esto podría abrir el post en un modal o navegar a una nueva vista
    },
  
    deleteReportedPost(postId, reportId) {
      if (confirm('¿Está seguro de que desea eliminar este post?')) {
        database.ref(`posts/${postId}`).remove()
          .then(() => {
            alert('Post eliminado con éxito');
            this.dismissReport(reportId);
          })
          .catch(error => console.error('Error al eliminar el post:', error));
      }
    },
  
    sendWarningToCreator(creatorId, reportId) {
      const warningMessage = prompt('Ingrese el mensaje de advertencia para el creador:');
      if (warningMessage) {
        database.ref(`warnings/${creatorId}`).push({
          message: warningMessage,
          timestamp: Date.now()
        }).then(() => {
          alert('Advertencia enviada al creador');
          this.dismissReport(reportId);
        }).catch(error => console.error('Error al enviar la advertencia:', error));
      }
    },
  
    dismissReport(reportId) {
      database.ref(`reports/${reportId}`).remove()
        .then(() => alert('Reporte descartado'))
        .catch(error => console.error('Error al descartar el reporte:', error));
    },
  

    initializeChat(otherUserId, otherUserNickname) {
      console.log('Iniciando chat:', this.userId, otherUserId);


      if (!this.userId || !otherUserId) {
        console.error('Error: userId o otherUserId es undefined', {
          userId: this.userId,
          otherUserId: otherUserId
        });
        alert('No se pudo iniciar el chat. Información de usuario incompleta.');
        return;
      }
      if (!this.userId || !otherUserId) {
        console.error('Error: userId o otherUserId es undefined');
        return;
      }
    
      const chatId = this.generateChatKey(this.userId, otherUserId);
      this.currentChatId = chatId;
      this.otherUserId = otherUserId;
      this.otherUserNickname = otherUserNickname;

      if (this.userId === otherUserId) {
        console.error('Error: No se puede iniciar un chat consigo mismo');
        return;
      }
      
      // Crear o actualizar la entrada del chat para ambos usuarios
      const updates = {};
      const currentUserChatData = {
        otherUserId: otherUserId,
        otherUserNickname: otherUserNickname || 'Usuario desconocido',
        lastMessage: '',
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        unreadCount: 0
      };
      
      const otherUserChatData = {
        otherUserId: this.userId,
        otherUserNickname: this.userNickname || 'Usuario desconocido',
        lastMessage: '',
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        unreadCount: 0
      };
      
      updates[`users/${this.userId}/chats/${chatId}`] = currentUserChatData;
      updates[`users/${otherUserId}/chats/${chatId}`] = otherUserChatData;
      
      firebase.database().ref().update(updates)
        .then(() => {
          this.loadMessages(chatId);
        })
        .catch((error) => {
          console.error('Error al inicializar el chat:', error);
        });
    },

    chatWithUser(otherUserId, otherUserNickname) {
      console.log('Intentando iniciar chat con:', otherUserId, otherUserNickname);
      console.log('Usuario actual:', this.userId, this.userNickname);
      
      if (!otherUserId) {
        console.error('Error: otherUserId es undefined');
        // Intenta obtener el ID del usuario seleccionado si está disponible
        otherUserId = this.selectedUserData && this.selectedUserData.id;
        if (!otherUserId) {
          alert('No se pudo iniciar el chat. ID de usuario no disponible.');
          return;
        }
      }
      
      if (!this.userId) {
        console.error('Error: this.userId es undefined');
        alert('Por favor, inicia sesión para chatear.');
        return;
      }
      
      this.initializeChat(otherUserId, otherUserNickname);
    },

    
    loadMessages(chatId) {
      console.log('Cargando mensajes para el chat:', chatId);
      firebase.database().ref(`chats/${chatId}/messages`).on('value', (snapshot) => {
        this.messages = [];
        snapshot.forEach((childSnapshot) => {
          this.messages.push(childSnapshot.val());
        });
        console.log('Mensajes cargados:', this.messages);
        this.$nextTick(() => {
          this.scrollToBottom();
        });
      });
    },
    sendMessage() {
      if (this.newMessage.trim() === '') return;
      
      const messageData = {
        content: this.newMessage,
        senderId: this.userId,
        senderNickname: this.userNickname,
        timestamp: firebase.database.ServerValue.TIMESTAMP
      };
      
      firebase.database().ref(`chats/${this.currentChatId}/messages`).push(messageData)
        .then(() => {
          // Actualizar último mensaje y contador de no leídos para el otro usuario
          const updates = {};
          updates[`users/${this.otherUserId}/chats/${this.currentChatId}/lastMessage`] = this.newMessage;
          updates[`users/${this.otherUserId}/chats/${this.currentChatId}/timestamp`] = firebase.database.ServerValue.TIMESTAMP;
          updates[`users/${this.otherUserId}/chats/${this.currentChatId}/unreadCount`] = firebase.database.ServerValue.increment(1);
          
          return firebase.database().ref().update(updates);
        })
        .then(() => {
          this.newMessage = '';
          this.scrollToBottom();
        })
        .catch((error) => {
          console.error('Error al enviar el mensaje:', error);
        });
    },


    scrollToBottom() {
      this.$nextTick(() => {
        if (this.$refs.chatMessages) {
          this.$refs.chatMessages.scrollTop = this.$refs.chatMessages.scrollHeight;
        }
      });
    },

    
    formatTimestamp(timestamp) {
      return new Date(timestamp).toLocaleString();
    },

    created() {
      this.loadUsers();
      this.loadReports();
      this.loadChats();
      // Cargar lista de chats del usuario
      firebase.database().ref(`users/${this.userId}/chats`).on('value', (snapshot) => {
        this.chats = [];
        snapshot.forEach((childSnapshot) => {
          const chatData = childSnapshot.val();
          this.chats.push({
            id: childSnapshot.key,
            otherUserId: chatData.otherUserId,
            otherUserNickname: chatData.otherUserNickname,
            lastMessage: chatData.lastMessage,
            timestamp: chatData.timestamp
          });
        });
      });
    },



    checkAdminStatus() {
      console.log('Verificando estado de administrador...');
      console.log('userId:', this.userId); // Log the userId to ensure it's correct
      database.ref('users/' + this.userId).once('value', snapshot => {
          const user = snapshot.val();
          console.log('Datos del usuario:', user);
          if (user && user.isAdmin) {
              this.isAdmin = true;  // Mark as admin if true
              console.log('Usuario es administrador.');
          } else {
              console.log('Usuario NO es administrador.');
          }
      }).catch(error => {
          console.error('Error al verificar estado de administrador:', error);
      });
  },
  
  
  

  showAdminPanel() {
    this.currentSection = 'adminPanel';
    this.loadVerificationRequests();  // Cargar las solicitudes al acceder al panel
},
loadVerificationRequests() {
  if (this.isAdmin) {
      database.ref('verificationRequests').once('value', snapshot => {
          this.verificationRequests = snapshot.val() || {};
      });
  }
},
  approveVerification(requestId) {
      const request = this.verificationRequests[requestId];
      if (request) {
          // Marcar al usuario como verificado
          database.ref('users/' + requestId).update({ isVerified: true })
              .then(() => {
                  alert('El usuario ha sido verificado.');
                  // Eliminar la solicitud después de la aprobación
                  database.ref('verificationRequests/' + requestId).remove();
                  this.loadVerificationRequests(); // Recargar las solicitudes
              })
              .catch(error => console.error('Error al aprobar la verificación:', error));
      }
  },
  rejectVerification(requestId) {
      // Rechazar la solicitud y eliminarla de la base de datos
      database.ref('verificationRequests/' + requestId).remove()
          .then(() => {
              alert('La solicitud ha sido rechazada.');
              this.loadVerificationRequests(); // Recargar las solicitudes
          })
          .catch(error => console.error('Error al rechazar la verificación:', error));
  },


   
      requestVerification() {
          // Marcar que el usuario ha solicitado verificación
          database.ref('verificationRequests/' + this.userId).set({
              nickname: this.userNickname,
              timestamp: new Date().toISOString(),
              status: 'pending'  // Estado inicial como pendiente
          }).then(() => {
              alert('Tu solicitud de verificación ha sido enviada.');
          }).catch((error) => {
              console.error('Error al solicitar la verificación:', error);
              alert('Hubo un problema al enviar tu solicitud. Por favor, intenta de nuevo.');
          });
      },

  

    showRulesPopup() {
      this.showRulesModal = true;  // Muestra el popup de las reglas
      const currentUrl = window.location.href;
      const url = new URL(currentUrl);
      url.hash = 'rules';
      window.history.replaceState(null, null, url);
  },
  

  acceptRules() {
    localStorage.setItem('rulesAccepted', 'true'); // Guarda la aceptación en localStorage
    this.showRulesModal = false;  // Cierra el popup después de aceptar

    // Quitar el hash de la URL cuando el popup se cierra
    const currentUrl = window.location.href.split('#')[0];
    window.history.replaceState(null, null, currentUrl);
},


    checkRulesAcceptance() {
      if (!localStorage.getItem('rulesAccepted')) {
        this.showRulesModal = true;
      }
    },
    acceptRules() {
      localStorage.setItem('rulesAccepted', 'true');
      this.showRulesModal = false;
    },


    goToHomeSection() {
      this.showAnnouncementButton = true; // Muestra el botón
      this.currentSection = 'feed'; // Cambia a la sección "Feed Público"
      window.scrollTo({ top: 0, behavior: 'smooth' }); // Realiza un scroll hasta la parte superior
    },

    startCompletionTimer() {
      setTimeout(() => {
          this.showCompletionLink = true;
      }, 120000); // 2 minutos en milisegundos
  },



  handleShortenerCompletion() {
    this.hasCompletedShortenerSteps = true;
    this.canPublish = true; // Ahora se puede publicar
    localStorage.setItem('completedShortenerSteps', 'true');
    alert("Has completado los pasos. Ahora puedes publicar tu post premium.");
},



    initializeQuillEditor() {
      const editorContainer = document.getElementById('editor');
      if (editorContainer) {
          this.quill = new Quill(editorContainer, {
              theme: 'snow',
              modules: {
                  toolbar: [
                      [{ 'header': [1, 2, false] }],
                      ['bold', 'italic', 'underline'],
                      ['link', 'blockquote', 'code-block', 'image'],
                      [{ 'list': 'ordered' }, { 'list': 'bullet' }]
                  ]
              }
          });
          this.quill.on('text-change', () => {
              this.checkPremiumImageRequirement();  // Verifica los cambios en el contenido
          });
      }
  },
   
   


    signInWithGoogle() {
      const provider = new firebase.auth.GoogleAuthProvider();
  
      auth.signInWithPopup(provider)
        .then((result) => {
          const user = result.user;
  
          // Verificar si el usuario es nuevo
          if (result.additionalUserInfo.isNewUser) {
            // Establecer bandera para solicitar el nickname
            this.isNewGoogleUser = true;
  
            // Mostrar el campo de nickname en la interfaz
            this.userId = user.uid;
            this.userEmail = user.email;
          } else {
            // Si el usuario ya existe, simplemente carga sus datos
            this.userId = user.uid;
            this.userEmail = user.email;
  
            database.ref('users/' + user.uid).once('value').then(snapshot => {
              this.userNickname = snapshot.val().nickname;
              this.isLoggedIn = true;
              this.clearAuthFields();
              this.showSection('feed');
            });
          }
        })
        .catch((error) => {
          console.error('Error al iniciar sesión con Google:', error);
          alert('No se pudo completar el inicio de sesión. Por favor, inténtalo de nuevo.');
        });
    },

    saveGoogleUserNickname() {
      if (this.nickname.trim() === '') {
        alert('Debes ingresar un nickname para continuar.');
        return;
      }
  
      // Guardar el usuario en la base de datos con el nickname
      database.ref('users/' + this.userId).set({
        email: this.userEmail,
        nickname: this.nickname
      }).then(() => {
        this.userNickname = this.nickname;
        this.isLoggedIn = true;
        this.isNewGoogleUser = false; // Restablecer la bandera
        this.clearAuthFields();
        this.showSection('feed');
      });
    },
    








    generateChatKey(userId1, userId2) {
      if (!userId1 || !userId2) {
        console.error('Error: Uno de los IDs de usuario es undefined');
        return null;
      }
      return [userId1, userId2].sort().join('_');
    },
    


  // Abrir una conversación específica
  openChat(chatId, otherUserId, otherUserNickname) {
    console.log('Abriendo chat:', chatId, otherUserId, otherUserNickname);
    this.currentChatId = chatId;
    this.otherUserId = otherUserId;
    this.otherUserNickname = otherUserNickname;
    this.loadMessages(chatId);
    // Marcar mensajes como leídos
    firebase.database().ref(`users/${this.userId}/chats/${chatId}`).update({ unreadCount: 0 });
    this.currentSection = 'chat'; // Cambia la sección actual a 'chat'
  },
    
  
  
  
    
  closeChat() {
    this.currentChatId = null;
    this.otherUserId = null;
    this.otherUserNickname = '';
    this.messages = [];
    this.currentSection = 'chats'; // Vuelve a la lista de chats
  },

switchChat(userId, nickname) {
  this.chatWithNickname = nickname;
  this.chatWithUserId = userId;
  this.currentChatKey = this.generateChatKey(this.userId, this.chatWithUserId);
  this.loadChatMessages(this.currentChatKey);
},

    
    


    
  
  
  
    
  
loadChatMessages() {
  const chatRef = database.ref(`chats/${this.currentChatId}/messages`);
  chatRef.on('value', (snapshot) => {
    this.messages = [];
    snapshot.forEach((childSnapshot) => {
      this.messages.push(childSnapshot.val());
    });
    this.$nextTick(() => {
      this.scrollToBottom();
    });
  });
},
  

watchForNewMessages() {
  const chatKeys = []; // lista de todas las claves de chat del usuario

  // Recorrer todos los chats en los que participa el usuario
  chatKeys.forEach(chatKey => {
      const chatRef = database.ref(`chats/${chatKey}`);
      chatRef.limitToLast(1).on('child_added', (snapshot) => {
          const newMessage = snapshot.val();
          if (newMessage.senderId !== this.userId) {
              this.unreadMessagesCount += 1; // Incrementar contador de mensajes no leídos
              this.showNotification(newMessage.senderNickname, newMessage.content);
          }
      });
  });
},
  
showNotification(senderNickname, messageContent) {
  // Lógica para mostrar notificación
  if (Notification.permission === "granted") {
      new Notification(`Nuevo mensaje de ${senderNickname}`, {
          body: messageContent,
          icon: "icono.png"
      });
  }
},
  


loadUserChats() {
  database.ref(`users/${this.userId}/chats`).on('value', (snapshot) => {
    this.chats = [];
    snapshot.forEach((childSnapshot) => {
      this.chats.push(childSnapshot.val());
    });
  });
},






        // Método para marcar al usuario como inactivo
        markUserAsInactive() {
          console.log('El usuario ha sido marcado como inactivo');
          if (this.isLoggedIn) { // Verifica si el usuario está logueado
              const userStatusDatabaseRef = firebase.database().ref('/status/' + this.userId);
              userStatusDatabaseRef.set({ online: false })
                .catch(error => {
                  console.error('Error al marcar el usuario como inactivo:', error);
                });
          }
        },
        
  
      // Método para resetear el temporizador de inactividad
      resetInactivityTimer() {
        if (this.inactivityTimeout) {
            clearTimeout(this.inactivityTimeout);
        }
        this.inactivityTimeout = setTimeout(this.markUserAsInactive, this.inactivityTimeLimit);
      },
  
      // Método para marcar al usuario como activo nuevamente
      markUserAsActive() {
        if (this.isLoggedIn) { // Verifica si el usuario está logueado
            const userStatusDatabaseRef = firebase.database().ref('/status/' + this.userId);
            userStatusDatabaseRef.set({ online: true })
              .catch(error => {
                console.error('Error al marcar el usuario como activo:', error);
              });
      
            // Resetear el temporizador de inactividad
            this.resetInactivityTimer();
        }
      },

    // Cuando se carga el contenido desde Quill
handleEditorContent() {
  const content = this.quill.root.innerHTML;

  // Agregar una clase a todas las imágenes para hacerlas responsivas
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = content;
  const images = tempDiv.querySelectorAll('img');
  images.forEach(img => {
      img.classList.add('responsive-quill-image');
      img.style.width = "100%";
      img.style.height = "auto";
  });

  this.quill.root.innerHTML = tempDiv.innerHTML;
},


    stripHtml(content) {
      const div = document.createElement('div');
      div.innerHTML = content;
      let text = div.textContent || div.innerText || '';
  
      // Reemplazar los saltos de línea y espacios
      text = text.replace(/<\/?h[1-6]>/g, '\n').replace(/<\/?p>/g, '\n\n');
      
      return text.trim();
  },

  stripHtml(text) {
    return text.replace(/<\/?[^>]+(>|$)/g, " ").replace(/\s+/g, ' ').trim();
},

  

openCreatePostPopup() {
  this.createPostKey += 1;
  this.showCreatePostPopup = true;

  // Restablecer solo los campos específicos
  this.newPostTitle = '';
  this.quill.root.innerHTML = '';  // Limpia el contenido del editor, pero mantiene la instancia
  this.newPostImageUrl = '';
  this.isPremium = false;

    // Forzar el reinicio del campo de archivo
    this.$nextTick(() => {
      const fileInput = document.querySelector('input[type="file"]');
      if (fileInput) {
          fileInput.value = '';  // Reinicia el campo de selección de archivo
          // Alternativamente, puedes clonar el elemento para garantizar que se reinicie completamente
          const newFileInput = fileInput.cloneNode(true);
          fileInput.replaceWith(newFileInput);
      }
  });
},








    

// Método para verificar si se debe mostrar el anuncio
showAnnouncement() {
  this.showAnnouncementModal = true;
  const announcementModal = document.getElementById('announcementModal');
  if (announcementModal) {
    announcementModal.style.display = 'block';
  } else {
    console.error('The announcement modal element was not found.');
  }
},
closeAnnouncement() {
  this.showAnnouncementModal = false;
  const announcementModal = document.getElementById('announcementModal');
  if (announcementModal) {
    announcementModal.style.display = 'none';
  }
  localStorage.setItem('announcementShown', 'true');
},
    
  
    

    // Navegar al perfil del creador
    viewCreatorProfile(authorId) {
      this.closePost();  // Close any open posts
      this.currentSection = 'creatorProfile';
      this.loadCreatorProfile(authorId);
      this.showAnnouncementButton = false; // Oculta el botón
      
        // Guarda el ID del creador seleccionado
  this.selectedUserData = { ...this.selectedUserData, id: authorId };


      // Scroll to the top of the page
      window.scrollTo({
          top: 0,
          behavior: 'smooth'
      });
  },

  // Cerrar el modal del post
  closePost() {
      this.isPostOpen = false;
  },
  
      // Cargar el perfil del creador seleccionado
      loadCreatorProfile(authorId) {
        // Cargar datos del usuario
        database.ref(`users/${authorId}`).once('value').then(snapshot => {
          const userData = snapshot.val();
          this.selectedUserData = {
            ...userData,
            id: authorId  // Asegúrate de incluir el ID
          };
          this.selectedUserNickname = userData.nickname;
          console.log('Datos del usuario cargados:', this.selectedUserData);
        });

        // Cargar posts del usuario
        database.ref('posts/' + authorId).orderByChild('timestamp').on('value', (snapshot) => {
            const posts = [];
            snapshot.forEach((childSnapshot) => {
                const post = childSnapshot.val();
                post.viewsCount = post.viewsCount || 0;
                post.likeCount = post.likeCount || 0;
                posts.push(post);
            });
            this.creatorPosts = posts.reverse(); // Mostrar el más reciente primero
        });
    },


    closeCreatePostPopup() {
      this.showCreatePostPopup = false;
  },  
  
   
    

      // Comprueba si el usuario actual ya sigue al autor del post
      isFollowing(userId) {
        return !!this.userData.following && !!this.userData.following[userId];
    },
    
    // Seguir a un usuario
    followUser(userId) {
      const updates = {};
      updates[`/users/${this.userId}/following/${userId}`] = true;
      updates[`/users/${userId}/followers/${this.userId}`] = true;
  
      database.ref().update(updates)
          .then(() => {
              alert('Ahora sigues a este usuario.');
              this.loadUserData();
          })
          .catch(error => {
              console.error('Error al seguir al usuario:', error);
          });
  },
  
    // Dejar de seguir a un usuario
    unfollowUser(userId) {
      const updates = {};
      updates[`/users/${this.userId}/following/${userId}`] = null;
      updates[`/users/${userId}/followers/${this.userId}`] = null;
  
      database.ref().update(updates)
          .then(() => {
              alert('Has dejado de seguir a este usuario.');
              this.loadUserData();
          })
          .catch(error => {
              console.error('Error al dejar de seguir al usuario:', error);
          });
  },
  
      // Cargar los datos del usuario actual, incluyendo sus seguidores y seguidos
      loadUserData() {
        database.ref(`users/${this.userId}`).once('value').then(snapshot => {
            this.userData = snapshot.val();
            this.$forceUpdate();  // Forzar la actualización de la vista
        });
    },
    
    


  // Comprueba si el autor del post es el usuario actual
  isCurrentUser(userId) {
    return this.userId === userId;
},




    toggleCommentMenu(commentId) {
      this.commentMenuOpen = this.commentMenuOpen === commentId ? null : commentId;
    },

    editComment(postId, commentId) {
      const comment = this.selectedPost.comments[commentId];
      const newContent = prompt("Edita tu comentario:", comment.content);
      if (newContent && newContent.trim() !== '') {
        database.ref(`posts/${this.selectedPost.authorId}/${postId}/comments/${commentId}/content`).set(newContent)
          .then(() => {
            this.loadPostComments(postId, this.selectedPost.authorId);
            this.commentMenuOpen = null;
          })
          .catch(error => console.error('Error al editar el comentario:', error));
      }
    },

    deleteComment(postId, commentId) {
      if (confirm("¿Estás seguro de que deseas eliminar este comentario?")) {
        database.ref(`posts/${this.selectedPost.authorId}/${postId}/comments/${commentId}`).remove()
          .then(() => {
            this.loadPostComments(postId, this.selectedPost.authorId);
            this.commentMenuOpen = null;
          })
          .catch(error => console.error('Error al eliminar el comentario:', error));
      }
    },

    handleClickOutside(event) {
      const notificationsDropdown = this.$refs.notificationsDropdown;
      const notificationsIcon = this.$refs.notificationsIcon;
  
      if (notificationsDropdown && !notificationsDropdown.contains(event.target) && 
          notificationsIcon && !notificationsIcon.contains(event.target)) {
        this.showingNotifications = false;
      }
    },
  


        // Método para añadir un nuevo comentario
        addComment(postId, authorId) {
          if (!this.newCommentContent.trim()) return;
        
          const newCommentId = database.ref().child('posts').push().key;
          const commentData = {
            content: this.newCommentContent,
            authorId: this.userId,
            authorNickname: this.userNickname,
            timestamp: Date.now(),
            replies: {}
          };
        
          const updates = {};
          updates[`/posts/${authorId}/${postId}/comments/${newCommentId}`] = commentData;
        
          database.ref().update(updates)
            .then(() => {
              this.newCommentContent = ''; // Limpiar el campo de comentario
              this.loadPostComments(postId, authorId); // Recargar comentarios
        
              // Enviar notificación al autor del post
              if (this.userId !== authorId) { // No enviar notificación si el autor es quien comentó
                const notificationId = database.ref().child('users').child(authorId).child('notifications').push().key;
                const notificationData = {
                  message: `Nuevo comentario en tu post.`,
                  postId: postId,
                  timestamp: Date.now(),
                  read: false
                };
                const notificationUpdate = {};
                notificationUpdate[`/users/${authorId}/notifications/${notificationId}`] = notificationData;
        
                database.ref().update(notificationUpdate);
              }
        
            })
            .catch((error) => {
              console.error('Error al añadir el comentario:', error);
            });
        },

        loadNotifications() {
          database.ref(`users/${this.userId}/notifications`).orderByChild('timestamp').on('value', (snapshot) => {
            this.notifications = [];
            snapshot.forEach(childSnapshot => {
              const notification = childSnapshot.val();
              this.notifications.push({
                id: childSnapshot.key,
                ...notification
              });
            });
            // Contar las notificaciones no leídas
            this.unreadNotificationsCount = this.notifications.filter(notification => !notification.read).length;
          });
        },
        showNotifications() {
          console.log('showNotifications called');
          this.showingNotifications = !this.showingNotifications;
        },
        
        markAsRead(notificationId) {
          database.ref(`users/${this.userId}/notifications/${notificationId}`).update({
            read: true
          });
          this.loadNotifications(); // Recargar las notificaciones para actualizar el contador
        },
    // Método viewPost que se llama cuando se hace clic en "Ver Post"
    viewPost(postId) {
      console.log('viewPost called with postId:', postId);
      this.showNotifications = false;  // Cierra el menú de notificaciones
      
      const post = this.allPosts.find(p => p.id === postId);
      if (post) {
        this.selectedPost = post;
        this.isPostOpen = true;  // Abre el modal o sección que muestra el post
      } else {
        console.error('Post not found');
      }
    },
    

        // Define el método showPost para mostrar un post
        showPost(postId) {
          const post = this.allPosts.find(p => p.id === postId);
          if (post) {
            this.selectedPost = post;
            this.isPostOpen = true;  // Abre el modal o sección que muestra el post
          }
        },
        formatTimestamp(timestamp) {
          if (!timestamp) return "Fecha no disponible";
          const date = new Date(timestamp);
          const options = { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' };
          return isNaN(date.getTime()) ? "Fecha inválida" : date.toLocaleString('es-ES', options);
      },
      
    
        // Método para añadir una respuesta a un comentario
        addReply(postId, authorId, commentId) {
          if (!this.newReplyContent.trim()) return;
    
          const newReplyId = database.ref().child('posts').push().key;
          const replyData = {
            content: this.newReplyContent,
            authorId: this.userId,
            authorNickname: this.userNickname,
            timestamp: Date.now()
          };
    
          const updates = {};
          updates[`/posts/${authorId}/${postId}/comments/${commentId}/replies/${newReplyId}`] = replyData;
    
          database.ref().update(updates)
            .then(() => {
              this.newReplyContent = ''; // Limpiar el campo de respuesta
              this.loadPostComments(postId, authorId); // Recargar comentarios
            })
            .catch((error) => {
              console.error('Error al añadir la respuesta:', error);
            });
        },
    
        // Cargar comentarios de un post
        loadPostComments(postId, authorId) {
          database.ref(`posts/${authorId}/${postId}/comments`).on('value', (snapshot) => {
            this.selectedPost.comments = snapshot.val() || {};
            console.log(this.selectedPost.comments); // Verificar si los comentarios se están cargando
          });
        },
        
    
        // Establecer el comentario al cual se le está respondiendo
        setReplyToComment(commentId) {
          this.replyingToCommentId = commentId;
        },
    
        // Método para cancelar una respuesta
        cancelReply() {
          this.replyingToCommentId = null;
          this.newReplyContent = '';
        },

        handleImageUpload(event) {
          const file = event.target.files[0];
          if (file) {
            const storageRef = firebase.storage().ref();
            const uploadTask = storageRef.child(`images/${file.name}`).put(file);
        
            uploadTask.on('state_changed', 
              (snapshot) => {
                // Puedes agregar código aquí para mostrar el progreso
              }, 
              (error) => {
                console.error('Error al subir la imagen:', error);
              }, 
              () => {
                uploadTask.snapshot.ref.getDownloadURL().then((downloadURL) => {
                  this.newPostImageUrl = downloadURL;
        
                  // Verifica si el post es premium y si se ha subido la imagen para habilitar el botón "Publicar"
                  this.checkPremiumImageRequirement();
                });
              }
            );
          }
        },
        
        
    
        checkPremiumImageRequirement() {
          if (this.isPremium && (!this.newPostImageUrl || !this.hasCompletedShortenerSteps)) {
              this.canPublish = false; // Desactiva si es premium, no tiene imagen o no se ha completado el acortador
          } else {
              this.canPublish = true; // Activa en cualquier otro caso
          }
      },

        
        
        
    


    



        openPost(postId, authorId) {
          console.log('Intentando abrir el post:', postId, authorId);
          
          // Buscar en allPosts y premiumPosts
          let post = this.allPosts.find(p => p.id === postId && p.authorId === authorId);
          if (!post) {
            post = this.premiumPosts.find(p => p.id === postId && p.authorId === authorId);
          }
          
          if (post) {
            this.selectedPost = post;
            this.isPostOpen = true;
            document.body.classList.add('no-scroll');
        
            // Incrementa las vistas si no existe ya un registro de vista para este usuario
            const userViewRef = database.ref(`posts/${authorId}/${postId}/views/${this.userId}`);
            userViewRef.once('value', (snapshot) => {
              if (!snapshot.exists()) {
                this.incrementViews(postId, authorId);
              }
            });
          } else {
            console.error('Post no encontrado:', postId, authorId);
          }
        },
       
      
        


  closePost() {
    this.isPostOpen = false;
    this.selectedPost = {};
    document.body.classList.remove('no-scroll'); // Habilita el scroll del fondo nuevamente
},

    incrementViews(postId, authorId) {
      const userViewRef = database.ref(`posts/${authorId}/${postId}/views/${this.userId}`);
      userViewRef.set(true);

      const postRef = database.ref(`posts/${authorId}/${postId}/viewsCount`);
      postRef.transaction((currentViews) => {
        return (currentViews || 0) + 1;
      });
    },

    likePost(postId, authorId) {
      if (!this.isLoggedIn) {
        alert('Debes iniciar sesión para dar un like.');
        return;
      }

      const userLikeRef = database.ref(`posts/${authorId}/${postId}/likes/${this.userId}`);

      userLikeRef.once('value', (snapshot) => {
        if (snapshot.exists()) {
        } else {
          userLikeRef.set(true);

          const postRef = database.ref(`posts/${authorId}/${postId}/likeCount`);
          postRef.transaction((currentLikes) => {
            return (currentLikes || 0) + 1;
          }).catch((error) => {
            console.error('Error al dar like:', error);
            alert('No se pudo registrar el like. Por favor, intenta de nuevo.');
          });
        }
      });
    },
    
  
  

// Método para crear una nueva publicación
createPost() {
  // Verificar si el usuario ha completado los pasos del acortador
  if (!this.hasCompletedShortenerSteps && this.isPremium) {
      alert("Por favor, completa los pasos para habilitar la publicación premium.");
      window.location.href = "https://justcut.io/creadorapp";
      return;
  }

  // Obtener el contenido desde el editor Quill
  const editorContent = this.quill ? this.stripHtml(this.quill.root.innerHTML).trim() : '';

  // Validar el título y el contenido
  if (this.newPostTitle.trim() === '' || editorContent === '') {
      alert('El título y el contenido no pueden estar vacíos.');
      return;
  }

  if (this.isUploading) {
      alert('Por favor espera a que la imagen se suba completamente.');
      return;
  }

  if (!this.canPublish) {
      alert('Debes subir una imagen para poder publicar como premium.');
      return;
  }

  const content = this.quill.root.innerHTML;  // Obtener el contenido HTML real

  const newPost = {
      title: this.newPostTitle,
      content: content,
      imageUrl: this.newPostImageUrl || '',
      isPremium: this.isPremium,
      authorId: this.userId,
      authorNickname: this.userNickname,
      timestamp: Date.now(),
      viewsCount: 0,
      likeCount: 0,
  };

  const newPostKey = database.ref().child('posts').push().key;

  const updates = {};
  updates['/posts/' + this.userId + '/' + newPostKey] = { id: newPostKey, ...newPost };

  database.ref().update(updates)
      .then(() => {
          this.newPostTitle = '';
          if (this.quill) {
              this.quill.root.innerHTML = '';  // Limpiar el contenido del editor
          }
          this.newPostImageUrl = '';
          this.isPremium = false;

          // Restablecer el campo de archivo después de la publicación
          const fileInput = document.querySelector('input[type="file"]');
          if (fileInput) {
              fileInput.value = '';  // Reinicia el campo de selección de archivo
          }

          // Actualiza los posts
          this.loadAllPosts();
          this.loadPremiumPosts();


      })
      .catch((error) => {
          console.error('Error al crear el post:', error);
      });
},






  // Método para cargar publicaciones premium
  loadPremiumPosts() {
    const premiumPostsRef = database.ref('posts');
    premiumPostsRef.once('value', (snapshot) => {
        const postsObj = {};
        snapshot.forEach((userPostsSnapshot) => {
            const authorId = userPostsSnapshot.key;
            userPostsSnapshot.forEach((childSnapshot) => {
                const post = childSnapshot.val();
                if (post.isPremium) {
                    const postId = childSnapshot.key;
                    postsObj[postId] = {
                        ...post,
                        id: postId,
                        authorId: authorId,
                        viewsCount: post.viewsCount || 0,
                        likeCount: post.likeCount || 0
                    };
                }
            });
        });

        // Convertir a array y ordenar por likes y vistas
        this.premiumPosts = Object.values(postsObj).sort((a, b) => {
            const aScore = (a.likeCount || 0) + (a.viewsCount || 0);
            const bScore = (b.likeCount || 0) + (b.viewsCount || 0);
            return bScore - aScore; // Ordenar por score descendente
        });

        console.log('Publicaciones Premium Cargadas:', this.premiumPosts);
    });
},

  
  
  
  
  
  
  
  
  
  
  
  
    

  // Modifica la función de carga de todos los posts para incluir premium
  loadAllPosts() {
    database.ref('posts').orderByChild('timestamp').on('value', (snapshot) => {
        const posts = [];
        const premiumPosts = [];
        
        snapshot.forEach((userPostsSnapshot) => {
            const authorId = userPostsSnapshot.key;
            userPostsSnapshot.forEach((childSnapshot) => {
                const post = childSnapshot.val();
                post.id = childSnapshot.key;
                post.authorId = authorId;

                // Obtener el estado de verificación del autor
                database.ref('users/' + authorId).once('value', (userSnapshot) => {
                    post.authorIsVerified = userSnapshot.val() && userSnapshot.val().isVerified || false;
                });

                // Listen for the online status of the author
                database.ref('status/' + post.authorId).on('value', (statusSnapshot) => {
                    post.isOnline = statusSnapshot.val() && statusSnapshot.val().online;

                    // Verifica si el usuario actual ya ha dado like
                    const userLikeRef = database.ref(`posts/${authorId}/${post.id}/likes/${this.userId}`);
                    userLikeRef.once('value', (likeSnapshot) => {
                        post.liked = likeSnapshot.exists(); // Establece la propiedad liked
                        
                        // Update post data
                        const existingPost = posts.find(p => p.id === post.id);
                        if (existingPost) {
                            Object.assign(existingPost, post);
                        } else {
                            if (post.isPremium) {
                                premiumPosts.push(post);  // Add to premium posts
                            } else {
                                posts.push(post);  // Add to normal posts
                            }
                        }

                        // Update the lists of posts and premiumPosts
                        this.allPosts = posts.sort((a, b) => b.timestamp - a.timestamp);
                        this.premiumPosts = premiumPosts.sort((a, b) => b.timestamp - a.timestamp);
                    });
                });
            });
        });
    });
},
  
  // Método auxiliar para actualizar un post en los arrays
  updatePostInArrays(updatedPost) {
    const updateInArray = (array) => {
      const index = array.findIndex(p => p.id === updatedPost.id);
      if (index !== -1) {
        this.$set(array, index, { ...array[index], ...updatedPost });
      }
    };
  
    updateInArray(this.allPosts);
    updateInArray(this.premiumPosts);
  },

  
  


  loadMyPosts() {
    if (!this.isLoggedIn) return;
    database.ref('posts/' + this.userId).orderByChild('timestamp').on('value', (snapshot) => {
      const posts = [];
      snapshot.forEach((childSnapshot) => {
        const post = childSnapshot.val();
        post.id = childSnapshot.key; // Asegúrate de que cada post tenga un ID único
        post.viewsCount = post.viewsCount || 0;
        post.likeCount = post.likeCount || 0;
        posts.push(post);
      });
      this.myPosts = posts.sort((a, b) => b.timestamp - a.timestamp);
    });
  },

    editPost(post) {
      const newTitle = prompt("Edita el título del post:", post.title);
      const newContent = prompt("Edita el contenido del post:", post.content);

      if (newTitle === null || newContent === null) return;

      if (newTitle.trim() === '' || newContent.trim() === '') {
        alert('El título y el contenido no pueden estar vacíos.');
        return;
      }

      database.ref('posts/' + this.userId + '/' + post.id).update({
        title: newTitle,
        content: newContent,
        timestamp: Date.now()
      })
        .then(() => {
          alert('Post actualizado exitosamente.');
          this.loadAllPosts();
          this.loadMyPosts();
        })
        .catch((error) => {
          console.error('Error al actualizar el post:', error);
        });
    },

    deletePost(postId) {
      if (confirm("¿Estás seguro de que deseas eliminar este post?")) {
        database.ref('posts/' + this.userId + '/' + postId).remove()
          .then(() => {
            this.loadAllPosts();
            this.loadMyPosts();
          })
          .catch((error) => {
            console.error('Error al eliminar el post:', error);
          });
      }
    },

    formatTimestamp(timestamp) {
      if (!timestamp) return "Fecha no disponible";
      const date = new Date(timestamp);
      const options = { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' };
      return isNaN(date.getTime()) ? "Fecha inválida" : date.toLocaleString('es-ES', options);
  },
  

 toggleAuthMode() {
   this.isRegistering = !this.isRegistering;
},


register() {
  if (this.nickname.trim() === '') {
    alert('El nickname es requerido.');
    return;
  }

  auth.createUserWithEmailAndPassword(this.email, this.password)
    .then((userCredential) => {
      const userId = userCredential.user.uid;
      this.isLoggedIn = true;
      this.userEmail = userCredential.user.email;
      this.userId = userId;
      this.userNickname = this.nickname;

      // Guardar el usuario en la base de datos
      database.ref('users/' + userId).set({
        email: this.userEmail,
        nickname: this.nickname
      });

      // Enviar correo de verificación
      userCredential.user.sendEmailVerification()
        .then(() => {
          alert('Se ha enviado un correo de verificación. Por favor revisa tu bandeja de entrada.');
        })
        .catch((error) => {
          console.error('Error al enviar el correo de verificación:', error);
          alert('Error al enviar el correo de verificación. Por favor, intenta de nuevo.');
        });

      this.clearAuthFields();
      this.showSection('feed');
    })
    .catch((error) => {
      console.error('Error al registrar:', error);
      alert(error.message);
    });
},

login() {
  auth.signInWithEmailAndPassword(this.email, this.password)
    .then((userCredential) => {
      const user = userCredential.user;
      if (user.emailVerified) {
        this.isLoggedIn = true;
        this.userEmail = user.email;
        this.userId = user.uid;
        console.log('Usuario logueado, userId:', this.userId); // Agrega esta línea
        
        // Cargar nickname desde la base de datos
        return database.ref('users/' + user.uid).once('value');
      } else {
        throw new Error('Por favor, verifica tu correo electrónico antes de continuar.');
      }
    })
    .then((snapshot) => {
      const userData = snapshot.val();
      if (userData && userData.nickname) {
        this.userNickname = userData.nickname;
      } else {
        console.error('No se encontró el nickname del usuario');
      }
      this.showSection('feed');
    })
    .catch((error) => {
      console.error('Error al iniciar sesión:', error);
      alert(error.message);
    });
},


    logout() {
      const userStatusDatabaseRef = firebase.database().ref('/status/' + this.userId);
      userStatusDatabaseRef.set({ online: false });
    
      auth.signOut()
        .then(() => {
          this.isLoggedIn = false;
          this.userEmail = '';
          this.userId = '';
          this.userNickname = '';
          this.myPosts = [];
          this.showSection('feed');
        })
        .catch((error) => {
          console.error('Error al cerrar sesión:', error);
        });
    },

    clearAuthFields() {
      this.email = '';
      this.password = '';
      this.nickname = '';
    },

    showSection(section) {

      console.log("Cambiando a sección:", section);
      this.currentSection = section;
      if (section === 'reportManagement') {
        this.loadReports();
      }
      this.currentSection = section;
    
      if (section === 'myPosts' && this.isLoggedIn) {
        this.loadMyPosts();
        this.showAnnouncementButton = false; // Oculta el botón
      } else if (section === 'chats' && this.isLoggedIn) {
        this.loadChats();
        this.showAnnouncementButton = false; // Oculta el botón en la sección de chats también
      } else {
        this.showAnnouncementButton = true; // Muestra el botón en otras secciones
      }
    
      // Si estamos cambiando a una sección que no es chats, cerramos cualquier chat abierto
      if (section !== 'chats') {
        this.currentChatId = null;
      }
    },


    loadChats() {
      firebase.database().ref(`users/${this.userId}/chats`).on('value', (snapshot) => {
        this.chats = [];
        this.unreadMessagesCount = 0;
        snapshot.forEach((childSnapshot) => {
          const chat = childSnapshot.val();
          this.chats.push({
            id: childSnapshot.key,
            otherUserId: chat.otherUserId,
            otherUserNickname: chat.otherUserNickname,
            lastMessage: chat.lastMessage,
            timestamp: chat.timestamp,
            unreadCount: chat.unreadCount || 0
          });
          this.unreadMessagesCount += chat.unreadCount || 0;
        });
      });
    },
  

    handleScroll() {
      const st = window.pageYOffset || document.documentElement.scrollTop;
      if (st > lastScrollTop) {
        this.showNavbar = false;
      } else {
        this.showNavbar = true;
      }
      lastScrollTop = st <= 0 ? 0 : st;
    }
  },



  mounted() {

    firebase.auth().onAuthStateChanged((user) => {
      if (user) {
        this.userId = user.uid;
        this.checkAdminStatus(); // Only check admin status after userId is set
    }
      if (user) {
        this.isLoggedIn = true;
        this.userId = user.uid;
        this.userEmail = user.email;
        console.log('Estado de autenticación cambiado, userId:', this.userId);
        // Cargar datos adicionales del usuario si es necesario
      } else {
        this.isLoggedIn = false;
        this.userId = null;
        this.userEmail = '';
        console.log('Usuario no autenticado');
      }
    });

            // Asigna el userId al cargar la aplicación (asumiendo que lo obtienes de alguna parte)
            this.userId = firebase.auth().currentUser ? firebase.auth().currentUser.uid : '';
            this.checkAdminStatus(); // Verificar si el usuario es admin al cargar la página
        

    if (this.isAdmin) {
      this.checkAdminStatus(); // Verificar si el usuario es admin al cargar la página
  } else if (this.currentSection === 'adminPanel') {
      this.currentSection = 'feed'; // Redirigir al feed si no es admin
      alert('No tienes permisos para acceder al Panel de Administración.');
  }

    if (this.isAdmin) {
      this.loadVerificationRequests(); // Cargar las solicitudes de verificación para el administrador
  }

        // Verifica si el usuario ya aceptó las reglas
        if (!localStorage.getItem('rulesAccepted')) {
          if (window.location.hash === '#rules') {
              this.showRulesPopup();
          }
      }
  

    this.checkRulesAcceptance();  // Verificar si las reglas ya fueron aceptadas

    // Verificar si la URL tiene el hash #rules para mostrar el popup
    if (window.location.hash === '#rules') {
        this.showRulesPopup();
    }

    const navbar = document.querySelector('.navbar');

    window.addEventListener('scroll', function() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
        if (scrollTop > lastScrollTop) {
            // Scroll hacia abajo - ocultar navbar
            navbar.style.top = '-100px'; // Ocultar la barra
        } else {
            // Scroll hacia arriba - mostrar navbar
            navbar.style.top = '10px'; // Restablecer el margen superior de 10px
        }
        
        lastScrollTop = scrollTop <= 0 ? 0 : scrollTop; // Para evitar números negativos en el scroll
    });
    




    this.hasCompletedShortenerSteps = localStorage.getItem('completedShortenerSteps') === 'true';



    this.loadUserChats();

    


        // Iniciar el temporizador de inactividad
        this.resetInactivityTimer();
            // Escuchar eventos de actividad
    window.addEventListener('mousemove', this.markUserAsActive);
    window.addEventListener('keydown', this.markUserAsActive);
    window.addEventListener('scroll', this.markUserAsActive);

    // Inicializa Quill cuando el componente esté montado y el contenedor esté en el DOM
    this.quill = new Quill('#editor', {
      theme: 'snow',
      modules: {
          toolbar: [
              [{ 'header': [1, 2, false] }],
              ['bold', 'italic', 'underline'],
              ['link', 'blockquote', 'code-block', 'image'],
              [{ 'list': 'ordered'}, { 'list': 'bullet' }]
          ]
      }
  });


  // Añadir el código para manejar el modo oscuro
  document.getElementById('toggleDarkMode').addEventListener('click', function() {

    // Toggle the dark mode class on the body
    document.body.classList.toggle('dark-mode');

    // Update the button text based on the current mode
    const button = document.getElementById('toggleDarkMode');
    if (document.body.classList.contains('dark-mode')) {
        button.textContent = 'Modo Claro';
    } else {
        button.textContent = 'Modo Oscuro';
    }

    // Save the mode preference to localStorage
    localStorage.setItem('darkMode', document.body.classList.contains('dark-mode') ? 'enabled' : 'disabled');


});

window.addEventListener('load', function() {
  const button = document.getElementById('toggleDarkMode');
  if (localStorage.getItem('darkMode') === 'enabled') {
      button.textContent = 'Modo Claro';
  } else {
      button.textContent = 'Modo Oscuro';
  }
});




// Verifica si el usuario ya había habilitado el modo oscuro anteriormente
if (localStorage.getItem('darkMode') === 'enabled') {
    document.body.classList.add('dark-mode');
    const containers = document.querySelectorAll('.auth-container, .feed-container, .my-posts-container, .post-item, .creator-profile-container, .creator-info, .followers-following-container, .search-bar, .post-item');
    containers.forEach(container => {
        container.classList.add('dark-mode');
    });
}





    if (!localStorage.getItem('announcementShown')) {
      this.showAnnouncementModal = true;
    }

    

    

    document.addEventListener('click', this.handleClickOutside);
    auth.onAuthStateChanged((user) => {
      if (user) {
        this.userId = user.uid;
        this.loadNotifications();
        this.isLoggedIn = true;
        this.userEmail = user.email;
            // El usuario está autenticado, cargar usuarios
    this.loadUsers();
        
        // Marcar usuario como online
        const userStatusDatabaseRef = firebase.database().ref('/status/' + user.uid);
        userStatusDatabaseRef.set({ online: true });
    
        // Actualizar a offline cuando el usuario cierra la ventana
        window.addEventListener('beforeunload', () => {
          userStatusDatabaseRef.set({ online: false });
        });
    
        // Leer y mostrar el estado del usuario
        database.ref('users/' + this.userId).once('value', snapshot => {
          const userData = snapshot.val();
          this.userNickname = userData.nickname || 'SinNombre'; // Asigna un nickname por defecto si no existe
          this.userOnline = userData.online;
    
          // Cargar posts y otros datos del usuario
          this.loadMyPosts();
          this.loadUserData(); // Cargar datos del usuario, incluidos seguidores y seguidos
        });
      } else {
        this.isLoggedIn = false;
        this.userEmail = '';
        this.userId = '';
        this.userNickname = '';
        this.myPosts = [];
            // El usuario no está autenticado, manejar el caso
    console.log('Usuario no autenticado');
      }
    });
    
    

    this.loadAllPosts();
    this.loadNotifications();

    // Cargar los comentarios cuando se monta la vista del post
    if (this.selectedPost) {
      this.loadPostComments(this.selectedPost.id, this.selectedPost.authorId);
    }

    window.addEventListener('scroll', this.handleScroll);
  },

  beforeDestroy() {
    // Este método debería estar aquí, no dentro de otra función
    document.removeEventListener('click', this.handleClickOutside);
        // Limpiar eventos y temporizador
        if (this.inactivityTimeout) {
          clearTimeout(this.inactivityTimeout);
      }
      window.removeEventListener('mousemove', this.markUserAsActive);
      window.removeEventListener('keydown', this.markUserAsActive);
      window.removeEventListener('scroll', this.markUserAsActive);
  },
});

database.ref('posts').once('value', (snapshot) => {
  const posts = [];
  snapshot.forEach((userPostsSnapshot) => {
    userPostsSnapshot.forEach((childSnapshot) => {
      const post = childSnapshot.val();
      console.log(post); // Esto te permitirá ver todas las publicaciones y sus propiedades.
      posts.push(post);
    });
  });
});


function checkScreenSize() {
  if (window.innerWidth <= 768) {
      console.log("Pantalla pequeña detectada");
  } else {
      console.log("Pantalla grande detectada");
  }
}

// Llama a la función al cargar la página
checkScreenSize();

// Escucha cambios en el tamaño de la ventana
window.addEventListener('resize', checkScreenSize);


// Maneja la apertura y cierre de la sidebar con el botón de hamburguesa
document.getElementById('menuToggle').addEventListener('click', function() {
  var sidebarMenu = document.getElementById('sidebarMenu');
  sidebarMenu.classList.toggle('active');
});

// Cierra la sidebar cuando se hace clic fuera de ella
document.addEventListener('click', function(event) {
  const sidebar = document.getElementById('sidebarMenu');
  const menuToggle = document.getElementById('menuToggle');

  // Verifica si el clic ocurrió fuera de la sidebar y del ícono de hamburguesa
  if (sidebar.classList.contains('active') && !sidebar.contains(event.target) && !menuToggle.contains(event.target)) {
      sidebar.classList.remove('active');
  }
});

// Función para cerrar la sidebar
function closeSidebar() {
  const sidebar = document.getElementById('sidebarMenu');
  if (sidebar.classList.contains('active')) {
      sidebar.classList.remove('active');
  }
}

// Maneja el modo oscuro y cierra la sidebar si está abierta
function toggleDarkMode() {
  // Alternar la clase dark-mode en el cuerpo
  document.body.classList.toggle('dark-mode');

  // Obtener el estado actual del modo oscuro
  const isDarkModeEnabled = document.body.classList.contains('dark-mode');

  // Actualizar el texto de ambos botones si existen
  if (document.getElementById('toggleDarkModeMain')) {
      document.getElementById('toggleDarkModeMain').textContent = isDarkModeEnabled ? 'Modo Claro' : 'Modo Oscuro';
  }
  if (document.getElementById('toggleDarkModeSidebar')) {
      document.getElementById('toggleDarkModeSidebar').textContent = isDarkModeEnabled ? 'Modo Claro' : 'Modo Oscuro';
  }

  // Guardar la preferencia en localStorage
  localStorage.setItem('darkMode', isDarkModeEnabled ? 'enabled' : 'disabled');

  // Cerrar la sidebar si está abierta
  closeSidebar();
}

document.addEventListener('DOMContentLoaded', function() {
  const toggleDarkModeMain = document.getElementById('toggleDarkModeMain');
  const toggleDarkModeSidebar = document.getElementById('toggleDarkModeSidebar');

  if (toggleDarkModeMain) {
      toggleDarkModeMain.addEventListener('click', toggleDarkMode);
  }

  if (toggleDarkModeSidebar) {
      toggleDarkModeSidebar.addEventListener('click', toggleDarkMode);
  }

  // Cierra la sidebar cuando se hace clic en los enlaces o en el botón de modo oscuro
  document.querySelectorAll('#sidebarMenu a, #toggleDarkModeSidebar').forEach(function(element) {
      element.addEventListener('click', function() {
          closeSidebar();
      });
  });
});

document.getElementById('scrollToTop').addEventListener('click', function() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});




