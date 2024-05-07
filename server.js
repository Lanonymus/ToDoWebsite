// Importuj moduły i ustaw serwer
const express = require('express');
const session = require('express-session');
const app = express();

app.use(express.static('public'));
app.use(express.json({limit: '1mb'}));

const port = process.env.PORT || 3000;

// Listen on `port` and 0.0.0.0
app.listen(port, "0.0.0.0", function () {
  => console.log('Server Live at PORT 0.0.0.0'))
});


// Ustawienie domyślnego silnika szablonów
app.set('view engine', 'ejs');


// Użyj sesji
app.use(session({
    secret: 'secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 } // Sesja będzie ważna przez 1 dzień (zmień według potrzeb)
}));



// Teraz możesz użyć `res.locals.userId` w swoich routach, aby sprawdzić, czy użytkownik jest zalogowany.

// Przykład zabezpieczenia routy przed dostępem niezalogowanego użytkownika


// Przechowuj użytkowników w pamięci dla uproszczenia
const { Pool } = require('pg');
const pool = new Pool({
    user: POSTGRES_USER,
    host: PGHOST,
    database: POSTGRES_DB,
    password: PGPASSWORD,
    port: PGPORT
});



app.post('/register', async (req, res) => {
    const { email, password, name } = req.body;

    try {
        // Sprawdź, czy użytkownik o podanym emailu już istnieje w bazie danych
        const userExists = await pool.query('SELECT * FROM to_do_db WHERE email = $1', [email]);

        if (userExists.rows.length > 0) {
            return res.json({ status: 'error', message: 'Użytkownik już istnieje' });
        }


        // Dodaj nowego użytkownika do bazy danych wraz z wygenerowanym identyfikatorem
        await pool.query('INSERT INTO to_do_db (name, email, password) VALUES ($1, $2, $3)', [name, email, password]);
        const id = await pool.query('SELECT * FROM to_do_db WHERE email = $1', [email]);
        const Userid = id.rows[0].id
        await pool.query('INSERT INTO profile_images (user_id, image_data) VALUES ($1, $2);',[Userid,"empty"])

        await pool.query('INSERT INTO user_theme (user_id,heading_color,button_color,product_entry_bg) VALUES ($1,$2,$3,$4)',
        [Userid,"rgb(77, 77, 255)","rgb(123, 54, 242)","rgb(96, 96, 191)"])

        // Zapisz identyfikator w sesji

        res.json({ status: 'Utworzono Konto' });
    } catch (error) {
        console.error('Błąd podczas rejestracji użytkownika:', error);
        res.status(500).json({ status: 'error', message: 'Wystąpił błąd podczas rejestracji użytkownika' });
    }
});


app.post('/ChangeUserProfile', async (req,res) => {
    const { edited_email, edited_name, edited_password } = req.body;
    const Userid = req.session.userId;

    // Sprawdź, czy email już istnieje w bazie danych (wykluczając aktualnego użytkownika)
    const check_emails = await pool.query('SELECT email FROM to_do_db WHERE email = $1 AND id != $2', [edited_email, Userid]);
    
    // Jeśli nie ma innych użytkowników o podanym emailu
    if (check_emails.rows.length < 1) {
        if (Userid) {
            // Aktualizuj dane użytkownika
            await pool.query('UPDATE to_do_db SET name = $1, password = $2, email = $3 WHERE id = $4', [edited_name, edited_password, edited_email, Userid]);
            res.json({status: "success", message: "udało się zmienić Ustawienia profilu"});
        }
    } else {
        res.json({status: "error", message: "Email already exists"});
    }
});


app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Sprawdź, czy użytkownik istnieje w bazie danych
        const user = await pool.query('SELECT * FROM to_do_db WHERE email = $1', [email]);
        
        if (user.rows.length === 0) {
            return res.json({ status: 'error', message: 'Użytkownik nie istnieje' });
        }

        // Sprawdź hasło
        if (password !== user.rows[0].password) {
            return res.json({ status: 'error', message: 'Niepoprawne hasło' });
        }

        // Zapisz identyfikator użytkownika w sesji
        req.session.userId = user.rows[0].id;
        req.session.userEmail = email


        res.json({ status: 'Zalogowano', User_name: user.rows[0].name, User_email: email });

    } catch (error) {
        console.error('Błąd podczas logowania użytkownika:', error);
        res.status(500).json({ status: 'error', message: 'Wystąpił błąd podczas logowania użytkownika' });
    }
});


app.post('/Change-profile-image', async (req,res) => {
    const {image} = req.body
    const Userid = req.session.userId
    try {
        if(Userid){
            // console.log('Received image URL:', image);
            await pool.query('UPDATE profile_images SET image_data = $1 WHERE user_id = $2;',[image,Userid])

            res.json({status: "success" , message: "Zaktualizowano zdjęcie użytkownika"})
        }
    }
    catch (error) {
        console.log(`Błąd podczas zmieniania zjdęcia użytkownika`);
        res.json({status: 'error', message: 'Za duże zdjęcie'})
    }

})


app.post('/ChangeTheme', async (req, res) => {
    const {heading_color,button_color,product_entry_bg} = req.body
    const Userid = req.session.userId;
    if (Userid) {
        try {
            await pool.query('UPDATE user_theme SET heading_color = $1, button_color = $2, product_entry_bg = $3 WHERE user_id = $4',
            [heading_color,button_color,product_entry_bg,Userid]);

            const show_theme = await pool.query('SELECT heading_color, button_color, product_entry_bg FROM user_theme WHERE user_id = $1', [Userid]);
            const theme = show_theme.rows[0];
            res.json({ status: "success", data: theme });
            
        } catch (error) {
            console.error("Błąd podczas zmiany motywu: ", error);
            res.status(500).json({ status: "error", message: "Błąd podczas zmiany motywu" });
        }
    }
});


app.post('/LoadTheme', async (req,res) =>{
    const Userid = req.session.userId;
    if (Userid) {
        console.log('test');
        const UserTheme = await pool.query('SELECT heading_color, button_color, product_entry_bg FROM user_theme WHERE user_id = $1', [Userid]);
        const theme = UserTheme.rows[0];
        res.json({ status: "success", data: theme });
    }
})


app.get('/Get-profile-image', async (req, res) => {
    const Userid = req.session.userId
    if(Userid){
        const result = await pool.query('SELECT image_data FROM profile_images WHERE user_id = $1;', [Userid])
        if(result.rows[0].image_data !== 'empty'){
            if(result.rows.length > 0){
                res.json({status: "success", image: result.rows[0].image_data})
            } else {
                res.json({status: "error", message: "Nie znaleziono zdjęcia użytkownika"})
        }}
        else{
            console.log(result.rows[0].image_data);
        }
    }
})


app.post('/check-login',async (req, res) => {
    if (req.session.userId) {
        const user = await pool.query('SELECT * FROM to_do_db WHERE id = $1', [req.session.userId]);
        // // Przyjmij dane binarne obrazu z bazy danych
        // const image = await pool.query('SELECT * FROM profile_images WHERE user_id = $1', [req.session.userId]);
        // console.log(req.session.userId);
        
        res.json({
            status: 'Zalogowano',
            User_name: user.rows[0].name,
            User_email: user.rows[0].email,
            User_password: user.rows[0].password,
            /*Profile_img:  image.rows[0].image_data*/ });
    } else {
        res.json({status: 'Niezalogowano'});
    }
});



app.post('/Edited-name',async (req, res) => {
    const {taskName , newTaskName, taskId} = req.body
    try {
        if (req.session.userId) {
            console.log(taskName , newTaskName, taskId);
                await pool.query('UPDATE tasks SET task_name = $1 WHERE user_id = $2 AND task_name = $3 AND taskid = $4', [newTaskName,req.session.userId,taskName,taskId]);
                await pool.query('UPDATE finished_tasks SET task_name = $1 WHERE user_id = $2 AND task_name = $3 AND taskid = $4', [newTaskName,req.session.userId,taskName,taskId]);
                res.json({status: 'Zmieniono nazwe zadania'});
        }
    } catch (error) {
        console.error('Błąd:', error);
        res.status(500).json({ error: 'Wystąpił błąd podczas zmiany nazwy' });
    }
});


app.post('/Edited-name-shopping',async (req, res) => {
    const {taskName ,taskId , newTaskName} = req.body
    try {
        if (req.session.userId) {
            console.log(taskName);
                await pool.query('UPDATE to_buy_goods SET task_name = $1 WHERE user_id = $2 AND task_name = $3 AND taskid = $4', [newTaskName,req.session.userId,taskName,taskId]);
                await pool.query('UPDATE bought_goods SET task_name = $1 WHERE user_id = $2 AND task_name = $3 AND taskid = $4', [newTaskName,req.session.userId,taskName,taskId]);
                res.json({status: 'Zmieniono nazwe produktu'});
            }
        } catch (error) {
            console.error('Błąd:', error);
            res.status(500).json({ error: 'Wystąpił błąd podczas zmiany nazwy' });
        }
    });



app.post('/end_session', async(req,res) => {
    req.session.userEmail = null
    req.session.userId = null
    res.json({status: 'Wylogowano'})
})

app.post('/add-task', async (req, res) => {
    const {taskId, taskName, taskDeadline, taskPriority } = req.body;
    
    // Pobierz identyfikator użytkownika z sesji
    const user_id = req.session.userId;
    if (user_id === null){
        res.json({status: 'użytkownik nie zalogowany'})
    }
    else{
        try {
            // Dodaj zadanie do bazy danych wraz z przypisanym identyfikatorem użytkownika
            await pool.query('INSERT INTO tasks (taskId, user_id, task_name, task_deadline, task_priority) VALUES ($1, $2, $3, $4, $5)', [taskId,user_id, taskName, taskDeadline, taskPriority]);
    
                    // Zapisz informacje o dodanym zadaniu w sesji użytkownika

            res.json({ status: 'Zadanie dodane' });
        } catch (error) {
            console.error('Błąd podczas dodawania zadania:', error);
            res.status(500).json({ status: 'error', message: 'Wystąpił błąd podczas dodawania zadania' });
        }
    }

});


app.post('/add-product', async (req, res) => {
    const {taskId, taskName} = req.body;
    
    // Pobierz identyfikator użytkownika z sesji
    const user_id = req.session.userId;
    if (user_id === null){
        res.json({status: 'użytkownik nie zalogowany'})
    }
    else{
        try {
            // Dodaj zadanie do bazy danych wraz z przypisanym identyfikatorem użytkownika
            await pool.query('INSERT INTO to_buy_goods (taskId, user_id, task_name) VALUES ($1, $2, $3)', [taskId,user_id, taskName]);
    
                    // Zapisz informacje o dodanym zadaniu w sesji użytkownika

            res.json({ status: 'Produkt dodany' });
        } catch (error) {
            console.error('Błąd podczas dodawania produktu:', error);
            res.status(500).json({ status: 'error', message: 'Wystąpił błąd podczas dodawania produktu' });
        }
    }


});


// Przy ponownym odwiedzeniu strony lub zalogowaniu, odczytaj informacje o postępie użytkownika z sesji
// Pobierz postęp użytkownika
app.get('/user-progress-tasks', async (req, res) => {
    const userId = req.session.userId;
    if (!userId) {
        // Użytkownik nie jest zalogowany, więc nie ma postępu do wyświetlenia
        return res.status(401).json({ error: 'Użytkownik niezalogowany' });
    }
    
    try {
        // Zapytanie do pobrania wybranych kolumn z tabeli tasks dla danego identyfikatora użytkownika
        const userTasks = await pool.query('SELECT taskId, task_name, task_deadline, task_priority FROM tasks WHERE user_id = $1', [userId]);
        if(userTasks.rows.length === 0){
            res.json({ tasks: 'empty'});  
        }
        else{
            res.json({ tasks: userTasks.rows });
        }
    } catch (error) {
        console.error('Błąd podczas pobierania postępu użytkownika:', error);
        res.status(500).json({ error: 'Wystąpił błąd podczas pobierania postępu użytkownika' });
    }
});



app.get('/user-progress-ToBuyGoods', async (req, res) => {
    const userId = req.session.userId;
    if (!userId) {
        // Użytkownik nie jest zalogowany, więc nie ma postępu do wyświetlenia
        return res.status(401).json({ error: 'Użytkownik niezalogowany' });
    }
    
    try {
        // Zapytanie do pobrania wybranych kolumn z tabeli tasks dla danego identyfikatora użytkownika
        const userTasks = await pool.query('SELECT taskId, task_name FROM to_buy_goods WHERE user_id = $1', [userId]);
        if(userTasks.rows.length === 0){
            res.json({ tasks: 'empty'});  
        }
        else{
            res.json({ tasks: userTasks.rows });
        }
    } catch (error) {
        console.error('Błąd podczas pobierania postępu użytkownika:', error);
        res.status(500).json({ error: 'Wystąpił błąd podczas pobierania postępu użytkownika' });
    }
});







app.get('/user-progress-finished-tasks', async (req, res) => {
    const userId = req.session.userId;
    if (!userId) {
        // Użytkownik nie jest zalogowany, więc nie ma postępu do wyświetlenia
        return res.status(401).json({ error: 'Użytkownik niezalogowany' });
    }

    try {
        // Zapytanie do pobrania wybranych kolumn z tabeli tasks dla danego identyfikatora użytkownika
        const userTasks = await pool.query('SELECT taskId, task_name, task_deadline, task_priority FROM finished_tasks WHERE user_id = $1', [userId]);
        // Zwróć postęp użytkownika w formacie JSON
        if(userTasks.rows.length === 0){
            res.json({ tasks: 'empty'});  
        }
        else{
            res.json({ tasks: userTasks.rows });
        }
    } catch (error) {
        console.error('Błąd podczas pobierania postępu użytkownika:', error);
        res.status(500).json({ error: 'Wystąpił błąd podczas pobierania postępu użytkownika' });
    }
});




app.get('/user-progress-BoughtGoods', async (req, res) => {
    const userId = req.session.userId;
    if (!userId) {
        // Użytkownik nie jest zalogowany, więc nie ma postępu do wyświetlenia
        return res.status(401).json({ error: 'Użytkownik niezalogowany' });
    }

    try {
        // Zapytanie do pobrania wybranych kolumn z tabeli tasks dla danego identyfikatora użytkownika
        const userTasks = await pool.query('SELECT taskId, task_name FROM bought_goods WHERE user_id = $1', [userId]);
        // Zwróć postęp użytkownika w formacie JSON
        if(userTasks.rows.length === 0){
            res.json({ tasks: 'empty'});  
        }
        else{
            res.json({ tasks: userTasks.rows });
        }
    } catch (error) {
        console.error('Błąd podczas pobierania postępu użytkownika:', error);
        res.status(500).json({ error: 'Wystąpił błąd podczas pobierania postępu użytkownika' });
    }
});










// Endpoint dla oznaczenia zadania jako ukończonego
app.post('/task-completed', async (req, res) => {
    const userId = req.session.userId;
    const { taskId } = req.body; // Pobierz taskId z ciała żądania
    if (userId){
    try {
        // Pobierz zadanie z tabeli tasks
        const task = await pool.query('SELECT * FROM tasks WHERE user_id = $1  AND taskId = $2',[userId,taskId]);
        if (task.rows.length === 0) {
            return res.status(404).json({ error: 'Zadanie nie znalezione' });
        }
        const { task_name, task_deadline, task_priority } = task.rows[0];

        // Dodaj zadanie do tabeli finished_tasks
        await pool.query('INSERT INTO finished_tasks (taskId ,user_id, task_name, task_deadline, task_priority) VALUES ($1, $2, $3, $4, $5)', [taskId ,userId, task_name, task_deadline, task_priority]);

        // Usuń zadanie z tabeli tasks
        await pool.query('DELETE FROM tasks WHERE user_id = $1  AND taskId = $2',[userId,taskId]);

        res.status(200).json({ message: 'Zadanie oznaczone jako ukończone' });
    } catch (error) {
        console.error('Błąd:', error);
        res.status(500).json({ error: 'Wystąpił błąd podczas oznaczania zadania jako ukończone' });
    }
}
});





// Endpoint dla przywrócenia zadania do listy zadań do wykonania
app.post('/task-uncompleted', async (req, res) => {
    const userId = req.session.userId;
    const { taskId } = req.body; // Pobierz taskId z ciała żądania
    if (userId){
        try {
            // Pobierz zadanie z tabeli finished_tasks
            const task = await pool.query('SELECT * FROM finished_tasks WHERE user_id = $1  AND taskId = $2',[userId,taskId]);
            if (task.rows.length === 0) {
                return res.status(404).json({ error: 'Zadanie nie znalezione' });
            }
            const {task_name, task_deadline, task_priority } = task.rows[0];

            // Dodaj zadanie do tabeli tasks
            await pool.query('INSERT INTO tasks (taskId ,user_id, task_name, task_deadline, task_priority) VALUES ($1, $2, $3, $4, $5)', [taskId ,userId, task_name, task_deadline, task_priority]);

            // Usuń zadanie z tabeli finished_tasks
            await pool.query('DELETE FROM finished_tasks WHERE user_id = $1  AND taskId = $2',[userId,taskId]);

            res.status(200).json({ message: 'Zadanie przywrócone do listy zadań do wykonania' });
        } catch (error) {
            console.error('Błąd:', error);
            res.status(500).json({ error: 'Wystąpił błąd podczas przywracania zadania' });
        }}
});





// Endpoint dla przywrócenia zadania do listy zadań do wykonania
app.post('/Product-not-bought', async (req, res) => {
    const userId = req.session.userId;
    const { taskId } = req.body; // Pobierz taskId z ciała żądania
    try {
        // Pobierz zadanie z tabeli finished_tasks
        const task = await pool.query('SELECT * FROM bought_goods WHERE user_id = $1  AND taskId = $2',[userId,taskId]);
        if (task.rows.length === 0) {
            return res.status(404).json({ error: 'Produkt nie znaleziony' });
        }
        const {task_name} = task.rows[0];

        // Dodaj zadanie do tabeli tasks
        await pool.query('INSERT INTO to_buy_goods (taskId ,user_id, task_name) VALUES ($1, $2, $3)', [taskId ,userId, task_name]);

        // Usuń zadanie z tabeli finished_tasks
        await pool.query('DELETE FROM bought_goods WHERE user_id = $1  AND taskId = $2',[userId,taskId]);

        res.status(200).json({ message: 'produkt przywrócony do listy zakupów' });
    } catch (error) {
        console.error('Błąd:', error);
        res.status(500).json({ error: 'Wystąpił błąd podczas przywracania produktu' });
    }
});


app.post("/Delete-from-tobuy", async (req,res) => {
    const {taskId} = req.body
    const LoggedIn = req.session.userId
    try{
        if(LoggedIn){
            await pool.query('DELETE FROM to_buy_goods WHERE user_id = $1 AND taskid = $2',[LoggedIn,taskId])
            res.json({status: "Udało sie usunąć Produkt"})
        }
    } catch (error) {
        console.error('Błąd:', error);
        res.status(500).json({ error: 'Wystąpił błąd podczas usuwania produktu' });
    }

})

app.post("/Delete-from-toDo", async (req,res) => {
    const {taskId} = req.body
    const LoggedIn = req.session.userId
    try{ 
        if(LoggedIn){
            await pool.query('DELETE FROM tasks WHERE user_id = $1 AND taskid = $2',[LoggedIn,taskId])
            res.json({status: "Udało sie usunąć zadanie"})
        }
    } catch (error) {
        console.error('Błąd:', error);
        res.status(500).json({ error: 'Wystąpił błąd podczas usuwania zadania' });
    }

})


app.post("/Delete-From-bought", async (req,res) => {
    const {taskId} = req.body
    const LoggedIn = req.session.userId
    try{
        if(LoggedIn){
            await pool.query('DELETE FROM bought_goods WHERE user_id = $1 AND taskid = $2',[LoggedIn,taskId])
            res.json({status: "Udało sie usunąć Kupiony Produkt"})
        }
    } catch (error) {
        console.error('Błąd:', error);
        res.status(500).json({ error: 'Wystąpił błąd podczas usuwania produktu' });
    }

})


app.post("/Delete-From-FinishedTasks", async (req,res) => {
    const {taskId} = req.body
    const LoggedIn = req.session.userId
    try {
        if(LoggedIn){
            await pool.query('DELETE FROM finished_tasks WHERE user_id = $1 AND taskid = $2',[LoggedIn,taskId])
            res.json({status: "Udało sie usunąć zrobione zadanie"})
        }
    } catch (error) {
        console.error('Błąd:', error);
        res.status(500).json({ error: 'Wystąpił błąd podczas usuwania zadania'});
    }
})


app.post('/Product-bought', async (req, res) => {
    const userId = req.session.userId;
    const { taskId } = req.body; // Pobierz taskId z ciała żądania
    try {
        // Pobierz zadanie z tabeli tasks
        const task = await pool.query('SELECT * FROM to_buy_goods WHERE user_id = $1  AND taskId = $2',[userId,taskId]);
        if (task.rows.length === 0) {
            return res.status(404).json({ error: 'Produkt nie znaleziony' });
        }
        const {task_name} = task.rows[0];

        // Dodaj zadanie do tabeli finished_tasks
        await pool.query('INSERT INTO bought_goods (taskId ,user_id, task_name) VALUES ($1, $2, $3)', [taskId ,userId, task_name]);

        // Usuń zadanie z tabeli tasks
        await pool.query('DELETE FROM to_buy_goods WHERE user_id = $1  AND taskId = $2',[userId,taskId]);

        res.status(200).json({ message: 'Produkt kupiony' });
    } catch (error) {
        console.error('Błąd:', error);
        res.status(500).json({ error: 'Wystąpił błąd podczas oznaczania produktu jako kupionego' });
    }
});
