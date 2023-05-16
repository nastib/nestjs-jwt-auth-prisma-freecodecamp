import { User } from '@prisma/client';
import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import * as argon from 'argon2';
import { AuthDto } from 'src/auth/dto';
import { ExceptionsHandler } from '@nestjs/core/exceptions/exceptions-handler';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}

  async signup(dto: AuthDto) {
    let user: User;

    //generate the password hash
    const hash = await argon.hash(dto.password);

    //save the new user in the db
    try {
      user = await this.prisma.user.create({
        data: {
          email: dto.email,
          hash,
        },
      });
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ForbiddenException('Credentials taken');
      }
      throw new ExceptionsHandler(error.message);
    }

    delete user.hash;

    return user;
  }

  async signin(dto: AuthDto) {
    //find user in db
    const userFound = await this.prisma.user.findFirst({
      where: {
        email: dto.email,
      },
      select: {
        email: true,
        hash: true,
      },
    });

    if (!userFound) {
      throw new ForbiddenException('  credentials incorrect');
    }

    //is password matched ??
    const pwMatches = await argon.verify(userFound.hash, dto.password);

    if (!pwMatches) {
      throw new ForbiddenException(' incorrect credentials');
    }
    delete userFound.hash;

    return userFound;
  }
}
