// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app"
import { child, get, getDatabase, ref, update } from "firebase/database"

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.API_KEY,
  authDomain: process.env.AUTH_DOMAIN,
  projectId: process.env.PROJECT_ID,
  storageBucket: process.env.STORAGE_BUCKET,
  messagingSenderId: process.env.MESSAGING_SENDER_ID,
  appId: process.env.APP_ID,
};
// Initialize Firebase
const app = initializeApp(firebaseConfig)
export const db = getDatabase(app)


export const getAllUsersFromRoom = async (room) => {
  console.log(room)
  let data = await get(child(ref(db), 'rooms/' + room))
  if (data.exists()) {
    let loggedUsers = data.val().users
    if (loggedUsers === undefined) {
      loggedUsers = []
    }
    return loggedUsers
  } else {
    console.error('No Data Found')
  }
  return []
}

export const updateUsers = (users, room) => {
  update(ref(db, 'rooms/' + room), {
    users: users
  })
}