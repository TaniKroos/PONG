provider "aws" {
   region = "ap-south-1"
}

resource "aws_instance" "PONGGGG" {
   ami = "ami-02b49a24cfb95941c"
   instance_type = "t2.micro"
   key_name = "PONG"
   tags = {
     Name = "PONGG"
   }

}

resource "aws_security_group" "instacne_pong" {
    name  = "instance_pong"
    description = "Allow inbound Traffic on post 22 and 3000"

    ingress  {
        from_port = 22
        to_port = 22
        protocol = "tcp"
        cidr_blocks =   ["0.0.0.0/0"]
    }

    ingress {
         from_port = 3000
        to_port = 3000
        protocol = "tcp"
        cidr_blocks =   ["0.0.0.0/0"]
    }
  
}

resource "aws_key_pair" "deployer" {
  key_name   = "PONGG"  # Replace with your key pair name
  public_key = file("~/.ssh/id_rsa.pub")  # Path to your public key file
}
