const oracledb = require('oracledb');

require('dotenv').config();

oracledb.initOracleClient({
    libDir: 'C:\\oraclexe\\app\\oracle\\product\\11.2.0\\server\\bin'
});

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
oracledb.autoCommit = false;

async function initPool() {
    await oracledb.createPool({
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        connectString: process.env.DB_CONNECT_STRING,
        poolMin: 2,
        poolMax: 10,
        poolIncrement: 1
    });

    console.log('Oracle connection pool started');
}

async function closePool() {
    await oracledb.getPool().close(10);
    console.log('Oracle connection pool closed');
}

async function withConnection(fn) {
    let conn;

    try {
        conn = await oracledb.getConnection();
        return await fn(conn);
    } finally {
        if (conn) {
            try {
                await conn.close();
            } catch (err) {
                console.error('Error closing connection', err);
            }
        }
    }
}

module.exports = {
    initPool,
    closePool,
    withConnection,
    oracledb
};