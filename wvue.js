
//使用的时候
// const vm = new Wvue({
//     data:{
//         msg:'你好'
//     }
// })
class Wvue {
    constructor(options){
        //把你传进来的配置项 
        this.$options = options
        //把要响应式的数据也保存一下
        this.$data = options.data
        //开始把数据变成响应式
        this.observe(this.$data)
        //把入口el 搞出来
        this.$el = options.el
        //手动测试
        new Compile(options.el,this)
        if(this.$options.created){
            this.$options.created.call(this)
        }
    }
    //观察data 递归便利data 是传递进来的对象 响应式
    observe(value){
        if( !value || typeof value !== 'object'){
            return
        }
        //便利了你data里的所有key 变成成一个数组 然后对key做响应式处理
        Object.keys(value).forEach( key => {
            //给每个key做响应式的处理 这里面的value 就是你的data对象 key 是你的data对象里的键 value[key] 是你data对象里的 键值
            this.defineReactive(value,key,value[key])
            //在这里 我们实现对this的一个劫持 把我们data里的数据 直接 在this中  这样 访问的时候就可以省略 中间的data
            this.proxyData(key)
        })
    }
    proxyData(key){
        Object.defineProperty(this,key,{
            get(){
                return this.$data[key]
            },
            set(newval){
                this.$data[key] = newval
            }
        })
    }
    defineReactive(obj,key,value){
        //如果你的对象还有对象 我就去递归 我们上面还有个判断  if( !value && typeof value !== 'object')
        this.observe(value)
        //创建Dep实例 让我们的依赖和我们的Dep 也就是你key 一对一 对应
        const dep = new Dep()
        //当你当问 vm.$data.msg的时候 就触发了get 把你的值给你返回了
        Object.defineProperty(obj,key,{
            get(){
                //将Dep.target 指向的Wacher 实例加入到Dep中 这样就是为什么 key会和我们的watcher有关联 对应上
                Dep.target && dep.addDep(Dep.target) //当我们的每个依赖都会产生一个watcher
                return value
            },
            //当你设置 vm.$data.msg的时候 就触发了set 会先比较 你的值跟你原来的值一样不一样 如果不一样我就赋值 这里形成了闭包
            set(newval){
                if(newval !== value){
                    value = newval
                    //通知 watcher 去更新
                    dep.notify()
                }
            }
        })
    }
}

//Dep:管理若干个watcher实例 它和key 是一对一的关系
class Dep {
    constructor(){ 
        this.deps = []
    }
    //每收集一个依赖 我们就在这里添加一个watcher
    addDep(watcher){
        this.deps.push(watcher)
    }

    //当数据更新时候 通知我们对应的watcher去做更新
    notify(){
        this.deps.forEach(watcher => watcher.update())
    }
}


//保存UI中的依赖 和自己一一对应 当dep通知我更新的时候 我去更新
class Watcher {
    constructor(vm,key,cb){
        //这里由于我们的watcher创建是在你compile解析双化括号的时候创建的 所以这个
        //vm是Wvue的实例 key 是你通过RegExp.$1 解析出来data里的变量键值 
        this.vm = vm
        this.key = key
        //赋值我们的回调函数
        this.cb = cb
        //将当前实例指向Dep.target 为了保证dep里的watcher
        Dep.target = this
        //访问一下Wvue里的data 触发get函数 让Dep类 把watcher添加进去
        this.vm[this.key]
        //以防万一 在恢复成null
        Dep.target = null

    }

    //dep通知我更新的时候 我去更新
    update(){
        //这里为了防止this指向有问题 所以用了call
        //调取了我们的解析{{}}括号的时候 更新视图中的那个函数
       this.cb.call(this.vm,this.vm[this.key])
    }
}