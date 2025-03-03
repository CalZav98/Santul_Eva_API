const mysql = require('mysql');
const config = require('../config');
const bcrypt = require('bcryptjs');

// Llamar variables de entorno

const dbconfig = {
    host: config.mysql.host,
    user: config.mysql.user,
    password: config.mysql.password,
    database: config.mysql.database
}

// Variable de conexion

let conexion;

// Funcion para conectarse a la BD

function conMySQL() {
    conexion = mysql.createConnection(dbconfig);
    // en caso de error al conectar
    conexion.connect((err) => {
        if (err) {
            console.log('[db err]', err);
            // volver a ejecutar la conexion
            setTimeout(conMySQL, 200);
        } else {
            console.log('Conexion exitosa');
        }
    });

    conexion.on('error', err => {
        console.log('[db err]', err);
        // en caso de perdidad de conexion, intentar volverse a conextar
        if (err.code == 'PROTOCOL_CONNECTION_LOST') {
            conMySQL();
        } else {
            throw err;
        }
    });
}

conMySQL();

// Otras funciones

function login_usuario(email, contraseña) {
    console.log(`Buscando usuario con correo: ${email}`);
    return new Promise((resolve, reject) => {
        // Buscar el usuario por su correo
        conexion.query(`SELECT * FROM usuarios WHERE correo = ?`, [email], (error, result) => {
            if (error) {
                return reject(error);
            }
            if (result.length === 0) {
                return reject(new Error('Usuario no encontrado.'));
            }

            const usuario = result[0];
            console.log(`Usuario encontrado: ${JSON.stringify(usuario)}`); // Agregado para depuración

            // Comparar la contraseña
            console.log(`Contraseña ingresada: ${contraseña}`); // Agregado para depuración
            console.log(`Contraseña almacenada: ${usuario.contraseña}`); // Agregado para depuración

            bcrypt.compare(contraseña, usuario.contraseña, (err, isMatch) => {
                if (err) {
                    return reject(err);
                }
                console.log(`¿Contraseña coincide? ${isMatch}`); // Agregado para depuración
                if (!isMatch) {
                    return reject(new Error('Contraseña incorrecta.'));
                }

                // Si la autenticación es exitosa, devolver el usuario
                resolve(usuario);
            });
        });
    });
}





// Funciones de la tabla Usuarios

function get_allusuarios(table) {
    return new Promise((resolve, reject) => {
        conexion.query(`SELECT * FROM ${table}`, (error, result) => {
            return error ? reject(error) : resolve(result);
        })
    });
}

function get_usuario(table, id) {
    return new Promise((resolve, reject) => {
        conexion.query(`SELECT * FROM ${table} WHERE id=${id}`, (error, result) => {
            return error ? reject(error) : resolve(result);
        })
    });
}

function reg_usuario(table, data) {
    return new Promise((resolve, reject) => {
        // Verificar si el correo ya está registrado
        conexion.query(`SELECT * FROM ${table} WHERE correo = ?`, [data.correo], (error, result) => {
            if (error) {
                return reject(error);
            }
            if (result.length > 0) {
                // En caso de que el correo ya esté registrado
                return reject(new Error('El correo ya está registrado.'));
            }

            // Encriptar la contraseña
            bcrypt.hash(data.contraseña, 10, (err, hashedPassword) => {
                if (err) {
                    return reject(err);
                }

                // Si el correo es único, se procede a insertar el nuevo usuario
                conexion.query(`INSERT INTO ${table} (nombre, correo, contraseña) VALUES (?, ?, ?)`,
                    [data.nombre, data.correo, hashedPassword], (error, result) => {
                        if (error) {
                            return reject(error);
                        }
                        resolve(result);
                    });
            });
        });
    });
}

function up_usuario(table, id, data) {
    return new Promise((resolve, reject) => {
        // Primero, obtener el correo actual del usuario
        conexion.query(`SELECT correo FROM ${table} WHERE id = ?`, [id], (error, result) => {
            if (error) {
                return reject(error);
            }
            if (result.length === 0) {
                return reject(new Error('Usuario no encontrado.'));
            }

            const correoActual = result[0].correo;

            // Verificar si el nuevo correo es diferente del actual
            if (data.correo !== correoActual) {
                // Verificar si el nuevo correo ya está registrado por otro usuario
                conexion.query(`SELECT * FROM ${table} WHERE correo = ? AND id <> ?`, [data.correo, id], (error, result) => {
                    if (error) {
                        return reject(error);
                    }
                    if (result.length > 0) {
                        // En caso de que el correo ya esté registrado por otro usuario
                        return reject(new Error('El correo ya está registrado.'));
                    }
                });
            }

            // Si el correo es único o no ha cambiado, se procede a actualizar el usuario
            conexion.query(`UPDATE ${table} SET nombre = ?, correo = ?, contraseña = ? WHERE id = ?`,
                [data.nombre, data.correo, data.contraseña, id], (error, result) => {
                    if (error) {
                        return reject(error);
                    }
                    resolve(result);
                });
        });
    });
}

function del_usuario(table, id) {
    return new Promise((resolve, reject) => {
        conexion.query(`DELETE FROM ${table} WHERE id = ?`, [id], (error, result) => {
            if (error) {
                console.error('Error al eliminar:', error);
                return reject(error);
            }
            console.log('Resultado de eliminación:', result);
            return resolve(result);
        });
    });
}

function del_tar_usuario(table, id) {
    return new Promise((resolve, reject) => {
        conexion.query(`DELETE FROM ${table} WHERE id_usuario = ?`, [id], (error, result) => {
            if (error) {
                console.error('Error al eliminar tareas:', error);
                return reject(error);
            }
            console.log('Tareas eliminadas:', result);
            return resolve(result);
        });
    });
}


// Funciones de la tabla Tareas

function get_alltareas(table) {
    return new Promise((resolve, reject) => {
        conexion.query(`SELECT * FROM ${table}`, (error, result) => {
            return error ? reject(error) : resolve(result);
        })
    });
}

function get_tarea(table, id) {
    return new Promise((resolve, reject) => {
        conexion.query(`SELECT * FROM ${table} WHERE id=${id}`, (error, result) => {
            return error ? reject(error) : resolve(result);
        })
    });
}

function reg_tarea(table, data) {
    return new Promise((resolve, reject) => {
        // Verificar si el usuario existe
        conexion.query(`SELECT * FROM usuarios WHERE id = ?`, [data.id_usuario], (error, result) => {
            if (error) {
                return reject(error);
            }
            if (result.length === 0) {
                return reject(new Error('Usuario no válido.'));
            }

            // Si el usuario es válido, se procede a insertar la nueva tarea
            conexion.query(`INSERT INTO ${table} (titulo, descripcion, estado, id_usuario) VALUES (?, ?, ?, ?)`,    
            [data.titulo, data.descripcion, data.estado, data.id_usuario], (error, result) => {
                if (error) {
                    return reject(error);
                }
                resolve(result);
            });
        });
    });
}

function up_tarea(table, id, data) {
    return new Promise((resolve, reject) => {
        // Verificar si el usuario existe
        conexion.query(`SELECT * FROM usuarios WHERE id = ?`, [data.id_usuario], (error, result) => {
            if (error) {
                return reject(error);
            }
            if (result.length === 0) {
                return reject(new Error('Usuario no válido.'));
            }

            // Si el usuario es válido, se procede a actualizar la tarea
            conexion.query(`UPDATE ${table} SET titulo = ?, descripcion = ?, estado = ?, id_usuario = ? WHERE id = ?`,
                [data.titulo, data.descripcion, data.estado, data.id_usuario, id], (error, result) => {
                    if (error) {
                        return reject(error);
                    }
                    resolve(result);
                });
        });
    });
}

function del_tarea(table, id) {
    return new Promise((resolve, reject) => {
        conexion.query(`DELETE FROM ${table} WHERE id = ?`, [id], (error, result) => {
            if (error) {
                console.error('Error al eliminar tarea:', error);
                return reject(error);
            }
            console.log('Resultado de eliminación:', result);
            return resolve(result);
        });
    });
}


module.exports = {
    get_allusuarios,
    get_usuario,
    reg_usuario,
    del_usuario,
    del_tar_usuario,
    up_usuario,
    login_usuario,

    get_alltareas,
    get_tarea,
    reg_tarea,
    del_tarea,
    up_tarea
}