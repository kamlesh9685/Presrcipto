import multer from 'multer'

const storage = multer.diskStorage({
    filename: function(req,file,callback){
        callback(null,file.originalname)
    }
})

//time 5:17:00

const upload = multer({storage})

export default upload